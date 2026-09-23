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
  it("acknowledges a confirmed write; sends only the email and group to MailerLite", async () => {
    upstreamFetch.mockResolvedValue(Response.json({ data: { email: "test@example.com" } }));
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: true });
    expect(upstreamFetch).toHaveBeenCalledOnce();
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
      groups: [groupId],
    });
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
