import { describe, expect, it } from "vitest";
import {
  isValidEmail,
  MARKETING_CONSENT_VERSION,
  parseLeadRequest,
} from "./contract";
import { TEST_VERSION } from "../self-esteem-v1/questions";

const input = {
  email: "test@example.com",
  marketingConsent: true,
  consentVersion: MARKETING_CONSENT_VERSION,
  testVersion: TEST_VERSION,
  submissionId: "11111111-1111-4111-8111-111111111111",
  website: "",
};

describe("lead request validation", () => {
  it("normalizes the email and admits exactly the agreed contact fields", () => {
    expect(parseLeadRequest({ ...input, email: " TEST@Example.com " })).toEqual({
      ok: true,
      lead: input,
    });
  });

  it.each([null, [], {}, "text", 0])("rejects malformed input %j", (value) => {
    expect(parseLeadRequest(value).ok).toBe(false);
  });

  it.each([false, "true", 1, undefined])("requires explicit consent %j", (marketingConsent) => {
    expect(parseLeadRequest({ ...input, marketingConsent })).toEqual({
      ok: false,
      error: "consent_required",
    });
  });

  it.each([
    "", "not-an-email", "a@localhost", ".a@example.com", "a.@example.com",
    "a..b@example.com", "a\n@example.com", "a@-example.com", "a@example-.com",
    `${"a".repeat(65)}@example.com`, `a@${"b".repeat(64)}.com`,
  ])("rejects an invalid email %j", (email) => {
    expect(isValidEmail(email)).toBe(false);
    expect(parseLeadRequest({ ...input, email }).ok).toBe(false);
  });

  it.each(["person+tag@example.com", "a@xn--bcher-kva.de", "a@example.123"])(
    "supports valid domain/local forms %s", (email) => {
      expect(parseLeadRequest({ ...input, email }).ok).toBe(true);
    },
  );

  it.each(["score", "answers", "ip", "secret"])("rejects unneeded data %s", (field) => {
    expect(parseLeadRequest({ ...input, [field]: "unneeded" })).toEqual({
      ok: false,
      error: "invalid_request",
    });
  });

  it.each([
    { submissionId: "not-a-uuid" }, { consentVersion: "outdated" },
    { testVersion: "outdated" }, { website: "a".repeat(201) },
  ])("rejects invalid metadata %j", (change) => {
    expect(parseLeadRequest({ ...input, ...change }).ok).toBe(false);
  });
});
