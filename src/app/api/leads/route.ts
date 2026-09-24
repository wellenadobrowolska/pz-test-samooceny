import { parseLeadRequest, type LeadErrorCode } from "../../../domain/leads/contract";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BODY_BYTES = 4096;
const RESPONSE_HEADERS = { "Cache-Control": "no-store" };

function failure(error: LeadErrorCode, status: number): Response {
  return Response.json({ ok: false, error }, { status, headers: RESPONSE_HEADERS });
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin || request.headers.get("sec-fetch-site") === "cross-site") {
    return false;
  }
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function readConfiguration(): { apiKey: string; groupId: string } | null {
  const apiKey = process.env.MAILERLITE_API_KEY;
  const groupId = process.env.MAILERLITE_GROUP_ID;
  if (
    !apiKey ||
    apiKey.length > 4096 ||
    apiKey !== apiKey.trim() ||
    /[\r\n]/.test(apiKey) ||
    !groupId ||
    !/^\d{1,30}$/.test(groupId)
  ) {
    return null;
  }
  return { apiKey, groupId };
}

async function readBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("missing_body");
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new Error("body_too_large");
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return failure("invalid_request", 403);
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  ) {
    return failure("invalid_request", 415);
  }

  let body: unknown;
  try {
    body = await readBody(request);
  } catch {
    return failure("invalid_request", 400);
  }
  const parsed = parseLeadRequest(body);
  if (!parsed.ok) return failure(parsed.error, 422);
  // Honeypot submissions are rejected, never stored or acknowledged as saved.
  if (parsed.lead.website !== "") return failure("invalid_request", 422);

  const configuration = readConfiguration();
  if (!configuration) return failure("not_configured", 503);

  let stage: "subscriber_upsert" | "group_assignment" = "subscriber_upsert";
  try {
    // Deliberately exclude answers, score, IP and browser telemetry.
    // Pola pz_* pozwalają połączyć lead z zakupem w Wellenie (pz_lead_id trafia
    // do linku „lead=…”) i policzyć koszt leada per reklama (pz_utm_content).
    const { email, submissionId, attribution } = parsed.lead;
    const fields: Record<string, string> = {
      pz_lead_id: submissionId,
      pz_lead_at: new Date().toISOString(),
    };
    if (attribution.source) fields.pz_utm_source = attribution.source;
    if (attribution.content) fields.pz_utm_content = attribution.content;
    const response = await fetch(
      "https://connect.mailerlite.com/api/subscribers",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${configuration.apiKey}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(18_000),
        body: JSON.stringify({ email, fields }),
      },
    );
    if (response.status === 429) {
      console.warn("MailerLite request was rate limited", { stage });
      return failure("rate_limited", 429);
    }
    if (response.status !== 200 && response.status !== 201) {
      console.warn("MailerLite request failed", { stage, status: response.status });
      return failure("save_unavailable", 502);
    }
    let result: unknown;
    try {
      result = await response.json();
    } catch {
      console.warn("MailerLite returned an invalid response", {
        stage,
        status: response.status,
      });
      return failure("save_unavailable", 502);
    }
    if (
      result === null ||
      typeof result !== "object" ||
      Array.isArray(result) ||
      !("data" in result) ||
      result.data === null ||
      typeof result.data !== "object" ||
      Array.isArray(result.data) ||
      !("id" in result.data) ||
      typeof result.data.id !== "string" ||
      !/^\d{1,30}$/.test(result.data.id) ||
      !("email" in result.data) ||
      typeof result.data.email !== "string" ||
      result.data.email.toLowerCase() !== email
    ) {
      console.warn("MailerLite returned an unexpected subscriber response", {
        stage,
        status: response.status,
      });
      return failure("save_unavailable", 502);
    }

    // Assign the group explicitly and only confirm the form after MailerLite
    // confirms that the returned subscriber was added to the requested group.
    stage = "group_assignment";
    const subscriberId = result.data.id;
    const groupResponse = await fetch(
      `https://connect.mailerlite.com/api/subscribers/${encodeURIComponent(subscriberId)}/groups/${encodeURIComponent(configuration.groupId)}`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${configuration.apiKey}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(18_000),
      },
    );
    if (groupResponse.status === 429) {
      console.warn("MailerLite request was rate limited", { stage });
      return failure("rate_limited", 429);
    }
    if (groupResponse.status !== 200 && groupResponse.status !== 201) {
      console.warn("MailerLite request failed", {
        stage,
        status: groupResponse.status,
      });
      return failure("save_unavailable", 502);
    }
    let groupResult: unknown;
    try {
      groupResult = await groupResponse.json();
    } catch {
      console.warn("MailerLite returned an invalid response", {
        stage,
        status: groupResponse.status,
      });
      return failure("save_unavailable", 502);
    }
    if (
      groupResult === null ||
      typeof groupResult !== "object" ||
      Array.isArray(groupResult) ||
      !("data" in groupResult) ||
      groupResult.data === null ||
      typeof groupResult.data !== "object" ||
      Array.isArray(groupResult.data) ||
      !("id" in groupResult.data) ||
      String(groupResult.data.id) !== configuration.groupId
    ) {
      console.warn("MailerLite returned an unexpected group response", {
        stage,
        status: groupResponse.status,
      });
      return failure("save_unavailable", 502);
    }

    return Response.json({ ok: true }, { headers: RESPONSE_HEADERS });
  } catch (error) {
    // Never log upstream responses, secrets, email addresses or request bodies.
    console.error("MailerLite request threw an error", {
      stage,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return failure("save_unavailable", 502);
  }
}
