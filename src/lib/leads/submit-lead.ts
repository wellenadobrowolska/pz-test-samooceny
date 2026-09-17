import {
  MARKETING_CONSENT_VERSION,
  normalizeEmail,
  type LeadErrorCode,
} from "../../domain/leads/contract";
import { TEST_VERSION } from "../../domain/self-esteem-v1/questions";

const ERROR_MESSAGES: Record<LeadErrorCode, string> = {
  invalid_request:
    "Nie udało się przyjąć formularza. Spróbuj ponownie. Jeśli problem się powtarza, odśwież stronę — odpowiedzi pozostaną zapisane, jeśli pozwalają na to ustawienia przeglądarki.",
  invalid_email: "Sprawdź, czy adres e-mail jest poprawny.",
  consent_required: "Zaznacz zgodę, aby przejść do wyniku.",
  not_configured:
    "Zapisy są chwilowo niedostępne. Nie zapisaliśmy Twojego adresu. Spróbuj ponownie później.",
  save_unavailable:
    "Nie udało się potwierdzić zapisu adresu. Sprawdź połączenie i spróbuj ponownie — ponowienie nie zdubluje zapisu.",
  rate_limited:
    "Zapisy są chwilowo przeciążone. Spróbuj ponownie za kilka minut.",
};

export class LeadSubmissionError extends Error {
  constructor(code: LeadErrorCode) {
    super(ERROR_MESSAGES[code]);
    this.name = "LeadSubmissionError";
  }
}

export function createSubmissionId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // Secure fallback for older mobile browsers that support getRandomValues.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

export async function submitLead(input: {
  email: string;
  submissionId: string;
  website: string;
}): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 22_000);

  try {
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
      body: JSON.stringify({
        email: normalizeEmail(input.email),
        marketingConsent: true,
        consentVersion: MARKETING_CONSENT_VERSION,
        testVersion: TEST_VERSION,
        submissionId: input.submissionId,
        website: input.website,
      }),
    });

    const result: unknown = await response.json();
    const data =
      result !== null && typeof result === "object"
        ? (result as Record<string, unknown>)
        : {};
    if (response.ok && data.ok === true) return;

    const error =
      typeof data.error === "string" &&
      Object.hasOwn(ERROR_MESSAGES, data.error)
        ? (data.error as LeadErrorCode)
        : "save_unavailable";
    throw new LeadSubmissionError(error);
  } catch (error) {
    if (error instanceof LeadSubmissionError) throw error;
    throw new LeadSubmissionError("save_unavailable");
  } finally {
    clearTimeout(timeout);
  }
}
