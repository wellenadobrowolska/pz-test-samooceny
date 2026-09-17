import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MARKETING_CONSENT_VERSION } from "../../../domain/leads/contract";
import { TEST_VERSION } from "../../../domain/self-esteem-v1/questions";
import { POST } from "./route";

const syntheticSecret = "test-secret-not-real-11111111111111111111";
const webAppUrl = "https://script.google.com/macros/s/test-deployment-id/exec";
const input = {
  email: " TEST@Example.com ",
  marketingConsent: true,
  consentVersion: MARKETING_CONSENT_VERSION,
  testVersion: TEST_VERSION,
  submissionId: "11111111-1111-4111-8111-111111111111",
  website: "",
};
const upstreamFetch = vi.fn<typeof fetch>();

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
  vi.stubEnv("GOOGLE_SHEETS_WEB_APP_URL", webAppUrl);
  vi.stubEnv("GOOGLE_SHEETS_SHARED_SECRET", syntheticSecret);
  vi.stubGlobal("fetch", upstreamFetch);
  upstreamFetch.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("POST /api/leads", () => {
  it("acknowledges a confirmed write; sends only the agreed fields to Google", async () => {
    upstreamFetch.mockResolvedValue(Response.json({ ok: true }));
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: true });
    expect(upstreamFetch).toHaveBeenCalledOnce();
    const [url, options] = upstreamFetch.mock.calls[0];
    expect(url).toBe(webAppUrl);
    const sent = JSON.parse(options?.body as string);
    expect(sent).toEqual({
      email: "test@example.com",
      marketingConsent: true,
      consentVersion: MARKETING_CONSENT_VERSION,
      testVersion: TEST_VERSION,
      submissionId: input.submissionId,
      secret: syntheticSecret,
      submittedAt: expect.any(String),
    });
    expect(Number.isFinite(Date.parse(sent.submittedAt))).toBe(true);
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

  it.each(["", "http://script.google.com/macros/s/id/exec", "https://evil.example.com/exec", "https://script.google.com/macros/s/id/dev", "https://script.google.com/macros/s/id/exec?secret=unsafe"])(
    "fails closed on missing/unsafe configuration %s", async (url) => {
      vi.stubEnv("GOOGLE_SHEETS_WEB_APP_URL", url);
      const response = await POST(request());
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ ok: false, error: "not_configured" });
      expect(upstreamFetch).not.toHaveBeenCalled();
    },
  );

  it("fails closed for a short secret", async () => {
    vi.stubEnv("GOOGLE_SHEETS_SHARED_SECRET", "short");
    expect((await POST(request())).status).toBe(503);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it.each([
    { ok: false, error: "unauthorized" }, {}, null, { ok: "true" },
  ])("does not mistake HTTP 200 for a successful write %j", async (body) => {
    upstreamFetch.mockResolvedValue(Response.json(body));
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, error: "save_unavailable" });
  });

  it("preserves a retryable rate-limit status", async () => {
    upstreamFetch.mockResolvedValue(Response.json({ ok: false, error: "rate_limited" }));
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

  it("handles upstream server errors and non-JSON authorization pages", async () => {
    upstreamFetch.mockResolvedValue(new Response("server-error", { status: 500 }));
    expect((await POST(request())).status).toBe(502);
    upstreamFetch.mockResolvedValue(new Response("<html>Login required</html>"));
    expect((await POST(request())).status).toBe(502);
  });
});
