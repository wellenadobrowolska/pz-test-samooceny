import { TEST_VERSION } from "../self-esteem-v2/questions";

export const MARKETING_CONSENT_VERSION = "marketing-email-v1-2026-09-15";
export const PRIVACY_POLICY_URL =
  "https://pracowniazycia.pl/polityka-prywatnosci-bezpieczenstwa-i-cookies/";
export const MARKETING_CONSENT_INTRO =
  "Wyrażam zgodę na otrzymywanie od Pracowni Życia drogą e-mail treści marketingowych zgodnie z";
export const MARKETING_CONSENT_WITHDRAWAL =
  "Zgodę mogę wycofać w każdej chwili.";

export type LeadRequest = {
  email: string;
  marketingConsent: true;
  consentVersion: typeof MARKETING_CONSENT_VERSION;
  testVersion: typeof TEST_VERSION;
  submissionId: string;
  website: string;
};

export type LeadErrorCode =
  | "invalid_request"
  | "invalid_email"
  | "consent_required"
  | "not_configured"
  | "save_unavailable"
  | "rate_limited";

const EMAIL_PATTERN =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;
const UUID_PATTERN =
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const FIELDS = new Set([
  "email",
  "marketingConsent",
  "consentVersion",
  "testVersion",
  "submissionId",
  "website",
]);

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  const [localPart, domain] = value.split("@");
  return (
    value.length <= 254 &&
    Boolean(localPart) &&
    localPart.length <= 64 &&
    !localPart.startsWith(".") &&
    !localPart.endsWith(".") &&
    !localPart.includes("..") &&
    Boolean(domain) &&
    domain.split(".").every((label) => label.length <= 63) &&
    EMAIL_PATTERN.test(value)
  );
}

export function parseLeadRequest(
  value: unknown,
): { ok: true; lead: LeadRequest } | { ok: false; error: LeadErrorCode } {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !FIELDS.has(key))
  ) {
    return { ok: false, error: "invalid_request" };
  }

  const input = value as Record<string, unknown>;
  if (typeof input.email !== "string") {
    return { ok: false, error: "invalid_email" };
  }
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) return { ok: false, error: "invalid_email" };
  if (input.marketingConsent !== true) {
    return { ok: false, error: "consent_required" };
  }
  if (
    input.consentVersion !== MARKETING_CONSENT_VERSION ||
    input.testVersion !== TEST_VERSION ||
    typeof input.submissionId !== "string" ||
    !UUID_PATTERN.test(input.submissionId) ||
    typeof input.website !== "string" ||
    input.website.length > 200
  ) {
    return { ok: false, error: "invalid_request" };
  }

  return {
    ok: true,
    lead: {
      email,
      marketingConsent: true,
      consentVersion: MARKETING_CONSENT_VERSION,
      testVersion: TEST_VERSION,
      submissionId: input.submissionId,
      website: input.website,
    },
  };
}
