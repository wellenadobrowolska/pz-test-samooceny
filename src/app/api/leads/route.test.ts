import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MARKETING_CONSENT_VERSION } from "../../../domain/leads/contract";
import { TEST_VERSION } from "../../../domain/self-esteem-v2/questions";
import { POST } from "./route";

const syntheticSecret = "test-secret-not-real-11111111111111111111";
const groupId = "123456789012345678";
const input = {
  email: " TEST@Example.com ",
  marketingConsent: true,
  consentVersion: MARKETING_CONSENT_VERSION,
  testVersion: TEST_VERSION,
  submissionId: "11111111-1111-4111-8111-111111111111",
  website: "",
};
const upstreamFetch = vi.fn<typeof fetch>();

const options = (value: unknown) => JSON.stringify(value);

function request(body: unknown = input, headers: Record<string, string> = {}) {
  return new Request("https://test.example.com/api/leads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://test.example.com",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("MAILERLITE_API_KEY", syntheticSecret);
  vi.stubEnv("MAILERLITE_GROUP_ID", groupId);
  vi.stubGlobal("fetch", upstreamFetch);
  upstreamFetch.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("POST /api/leads", () => {
  it("acknowledges a confirmed write only after assigning the subscriber to the group", async () => {
    upstreamFetch
      .mockResolvedValueOnce(Response.json({
        data: { id: "987654321", email: "test@example.com" },
      }, { status: 201 }))
      .mockResolvedValueOnce(Response.json({
        data: { id: groupId, name: "Test group" },
      }, { status: 201 }));
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: true });
    expect(upstreamFetch).toHaveBeenCalledTimes(2);
    const [url, options] = upstreamFetch.mock.calls[0];
    expect(url).toBe("https://connect.mailerlite.com/api/subscribers");
    expect(options?.headers).toMatchObject({
      Accept: "application/json",
      Authorization: `Bearer ${syntheticSecret}`,
      "Content-Type": "application/json",
    });
    const sent = JSON.parse(options?.body as string);
    expect(sent).toEqual({
      email: "test@example.com",
      fields: {
        pz_lead_id: input.submissionId,
        pz_lead_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
      },
    });

    const [assignmentUrl, assignmentOptions] = upstreamFetch.mock.calls[1];
    expect(assignmentUrl).toBe(
      `https://connect.mailerlite.com/api/subscribers/987654321/groups/${groupId}`,
    );
    expect(assignmentOptions?.method).toBe("POST");
    expect(assignmentOptions?.headers).toMatchObject({
      Authorization: `Bearer ${syntheticSecret}`,
    });
    expect(assignmentOptions?.body).toBeUndefined();
  });

  it("forwards only allow-listed utm_source and utm_content as MailerLite fields", async () => {
    upstreamFetch
      .mockResolvedValueOnce(Response.json({
        data: { id: "987654321", email: "test@example.com" },
      }, { status: 201 }))
      .mockResolvedValueOnce(Response.json({
        data: { id: groupId, name: "Test group" },
      }, { status: 201 }));
    const response = await POST(request({
      ...input,
      attribution: { source: "meta", content: "H1-krok", medium: "cpc", email: "x@y.pl" },
    }));
    expect(response.status).toBe(200);
    const sent = JSON.parse(upstreamFetch.mock.calls[0][1]?.body as string);
    expect(sent.fields).toMatchObject({ pz_utm_source: "meta", pz_utm_content: "H1-krok" });
    expect(Object.keys(sent.fields).sort()).toEqual(
      ["pz_lead_at", "pz_lead_id", "pz_utm_content", "pz_utm_source"],
    );
    expect(options(sent)).not.toContain("x@y.pl");
  });

  it("drops attribution values outside the allow-list instead of failing", async () => {
    upstreamFetch
      .mockResolvedValueOnce(Response.json({
        data: { id: "987654321", email: "test@example.com" },
      }, { status: 201 }))
      .mockResolvedValueOnce(Response.json({
        data: { id: groupId, name: "Test group" },
      }, { status: 201 }));
    const response = await POST(request({
      ...input,
      attribution: { source: "meta<script>", content: "a b" },
    }));
    expect(response.status).toBe(200);
    const sent = JSON.parse(upstreamFetch.mock.calls[0][1]?.body as string);
    expect(Object.keys(sent.fields).sort()).toEqual(["pz_lead_at", "pz_lead_id"]);
  });

  it.each([undefined, "https://evil.example.com"])("rejects foreign/missing origin %s", async (origin) => {
    const req = request();
    if (origin === undefined) req.headers.delete("origin");
    else req.headers.set("origin", origin);
    expect((await POST(req)).status).toBe(403);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it("rejects cross-site requests even with a matching Origin header", async () => {
    expect((await POST(request(input, { "Sec-Fetch-Site": "cross-site" }))).status).toBe(403);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it("rejects form data, invalid JSON and oversized streamed bodies", async () => {
    expect((await POST(request(input, { "Content-Type": "text/plain" }))).status).toBe(415);
    expect((await POST(request("not-json"))).status).toBe(400);
    expect((await POST(request("a".repeat(4097)))).status).toBe(400);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it.each([
    { email: "invalid" }, { marketingConsent: false }, { consentVersion: "old" },
    { website: "filled-by-bot" }, { score: 25 }, { answers: [] },
  ])("never forwards rejected or excessive input %j", async (change) => {
    expect((await POST(request({ ...input, ...change }))).status).toBe(422);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it.each(["", "group-id", "123/456", "1".repeat(31)])(
    "fails closed on missing/unsafe group configuration %s", async (configuredGroupId) => {
      vi.stubEnv("MAILERLITE_GROUP_ID", configuredGroupId);
      const response = await POST(request());
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ ok: false, error: "not_configured" });
      expect(upstreamFetch).not.toHaveBeenCalled();
    },
  );

  it("fails closed for an empty API key", async () => {
    vi.stubEnv("MAILERLITE_API_KEY", "");
    expect((await POST(request())).status).toBe(503);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it("does not acknowledge an upstream validation error", async () => {
    upstreamFetch.mockResolvedValue(Response.json({ message: "Invalid group" }, { status: 422 }));
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, error: "save_unavailable" });
  });

  it("does not show the result if MailerLite cannot assign the requested group", async () => {
    upstreamFetch
      .mockResolvedValueOnce(Response.json({
        data: { id: "987654321", email: "test@example.com" },
      }, { status: 201 }))
      .mockResolvedValueOnce(Response.json({ message: "Invalid group" }, { status: 422 }));
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, error: "save_unavailable" });
    expect(upstreamFetch).toHaveBeenCalledTimes(2);
  });

  it("preserves a retryable rate-limit status", async () => {
    upstreamFetch.mockResolvedValue(Response.json({ message: "Too Many Attempts." }, { status: 429 }));
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ ok: false, error: "rate_limited" });
  });

  it("does not expose PII or upstream error details", async () => {
    upstreamFetch.mockRejectedValue(new Error("test@example.com " + syntheticSecret));
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("test@example.com");
  });

  it("handles upstream server errors and authorization pages", async () => {
    upstreamFetch.mockResolvedValue(new Response("server-error", { status: 500 }));
    expect((await POST(request())).status).toBe(502);
    upstreamFetch.mockResolvedValue(new Response("<html>Login required</html>"));
    expect((await POST(request())).status).toBe(502);
  });
});
