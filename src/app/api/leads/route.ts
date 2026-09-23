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

  try {
    // Deliberately exclude answers, score, IP and browser telemetry.
    const { email } = parsed.lead;
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
        body: JSON.stringify({ email, groups: [configuration.groupId] }),
      },
    );
    if (response.status === 429) return failure("rate_limited", 429);
    if (response.status !== 200 && response.status !== 201) {
      return failure("save_unavailable", 502);
    }
    let result: unknown;
    try {
      result = await response.json();
    } catch {
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
      !("email" in result.data) ||
      typeof result.data.email !== "string" ||
      result.data.email.toLowerCase() !== email
    ) {
      return failure("save_unavailable", 502);
    }
    return Response.json({ ok: true }, { headers: RESPONSE_HEADERS });
  } catch {
    // Never log upstream responses, secrets, email addresses or request bodies.
    return failure("save_unavailable", 502);
  }
}
