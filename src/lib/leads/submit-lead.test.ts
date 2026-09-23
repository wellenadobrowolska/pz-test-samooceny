import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSubmissionId, LeadSubmissionError, submitLead } from "./submit-lead";
import { MARKETING_CONSENT_VERSION } from "../../domain/leads/contract";
import { TEST_VERSION } from "../../domain/self-esteem-v2/questions";

const id = "11111111-1111-4111-8111-111111111111";
const input = { email: " TEST@Example.com ", submissionId: id, website: "" };
const apiFetch = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", apiFetch);
  apiFetch.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe("contact submission", () => {
  it("uses the same-origin API without score, answers or external secrets", async () => {
    apiFetch.mockResolvedValue(Response.json({ ok: true }));
    await submitLead(input);
    expect(apiFetch).toHaveBeenCalledOnce();
    const [url, options] = apiFetch.mock.calls[0];
    expect(url).toBe("/api/leads");
    expect(JSON.parse(options?.body as string)).toEqual({
      email: "test@example.com",
      marketingConsent: true,
      consentVersion: MARKETING_CONSENT_VERSION,
      testVersion: TEST_VERSION,
      submissionId: id,
      website: "",
    });
  });

  it.each([
    { ok: false, error: "not_configured" }, { ok: false, error: "rate_limited" },
    { ok: false, error: "invalid_email" }, {}, { ok: "true" }, null,
  ])("does not reveal a result after unconfirmed capture %j", async (body) => {
    apiFetch.mockResolvedValue(Response.json(body));
    await expect(submitLead(input)).rejects.toBeInstanceOf(LeadSubmissionError);
  });

  it("does not accept ok:true with a failed HTTP status", async () => {
    apiFetch.mockResolvedValue(Response.json({ ok: true }, { status: 502 }));
    await expect(submitLead(input)).rejects.toBeInstanceOf(LeadSubmissionError);
  });

  it("keeps the same request ID on retry", async () => {
    apiFetch.mockRejectedValueOnce(new Error("offline"));
    apiFetch.mockResolvedValueOnce(Response.json({ ok: true }));
    await expect(submitLead(input)).rejects.toThrow("Nie udało się potwierdzić");
    await submitLead(input);
    const ids = apiFetch.mock.calls.map((call) => JSON.parse(call[1]?.body as string).submissionId);
    expect(ids).toEqual([id, id]);
  });

  it("maps unknown or HTML upstream failures to a safe message", async () => {
    apiFetch.mockResolvedValue(new Response("<html>error</html>"));
    await expect(submitLead(input)).rejects.toThrow("Nie udało się potwierdzić");
  });

  it("creates a secure v4 UUID when mobile randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (bytes: Uint8Array) => bytes.fill(0),
    });
    expect(createSubmissionId()).toBe("00000000-0000-4000-8000-000000000000");
  });
});
