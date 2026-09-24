// Pomiar testu samooceny: zdarzenia trafiają do dataLayer, a GTM (GTM-NFSSZ5Z)
// wysyła je do GA4 i Meta tylko przy zgodzie z CookieYes.
//
// Prywatność (plan pomiaru, rozdz. 4): do analityki NIGDY nie trafia wynik,
// odpowiedzi ani adres e-mail. Dlatego typy poniżej dopuszczają wyłącznie
// wersję testu, numer pytania i dane o kliknięciu w link.

export const GTM_ID = "GTM-NFSSZ5Z";

const CONSENT_EVENT = "cookie_consent_update";
const POLL_MS = 100;
const MAX_WAIT_MS = 5000;

export type AnalyticsEvent =
  | {
      event:
        | "self_assessment_view"
        | "self_assessment_start"
        | "self_assessment_complete"
        | "self_assessment_email_submit"
        | "self_assessment_result_view";
      testVersion: string;
    }
  | {
      event: "self_assessment_question_view";
      testVersion: string;
      questionNumber: number;
    }
  | {
      event: "wellena_cta_click";
      ctaLocation: string;
      linkUrl: string;
      linkText: string;
    };

type DataLayerEntry = Record<string, unknown>;

export type AnalyticsTarget = {
  dataLayer?: unknown[];
};

type QueueState = {
  queue: DataLayerEntry[];
  timer: ReturnType<typeof setInterval> | null;
  waited: number;
};

const states = new WeakMap<AnalyticsTarget, QueueState>();

function withoutQuery(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname;
  } catch {
    return url.split(/[?#]/)[0];
  }
}

export function toDataLayerEntry(input: AnalyticsEvent): DataLayerEntry {
  switch (input.event) {
    case "self_assessment_question_view":
      return {
        event: input.event,
        test_version: input.testVersion,
        question_number: input.questionNumber,
      };
    case "wellena_cta_click":
      return {
        event: input.event,
        source_page: "test-samooceny",
        cta_location: input.ctaLocation,
        // Bez zapytania: link do Welleny niesie `lead=…`, który nie może trafić do analityki.
        link_url: withoutQuery(input.linkUrl),
        link_text: input.linkText.replace(/\s+/g, " ").trim().slice(0, 80),
      };
    default:
      return { event: input.event, test_version: input.testVersion };
  }
}

function hasConsentSignal(dataLayer: unknown[]): boolean {
  return dataLayer.some(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      (entry as DataLayerEntry).event === CONSENT_EVENT,
  );
}

function flush(dataLayer: unknown[], state: QueueState) {
  if (state.timer) clearInterval(state.timer);
  state.timer = null;
  const pending = state.queue;
  state.queue = [];
  for (const entry of pending) dataLayer.push(entry);
}

// CookieYes przy każdym wczytaniu najpierw ustawia domyślną odmowę, a zapisaną
// zgodę podaje dopiero w cookie_consent_update. Zdarzenia sprzed tego sygnału
// GTM by zablokował, więc czekają (najdłużej 5 s) i idą zaraz po nim, w kolejności.
export function trackEvent(
  input: AnalyticsEvent,
  target: AnalyticsTarget | undefined = typeof window === "undefined"
    ? undefined
    : (window as AnalyticsTarget),
) {
  if (!target) return;

  target.dataLayer = target.dataLayer ?? [];
  const dataLayer = target.dataLayer;
  const entry = toDataLayerEntry(input);

  let state = states.get(target);
  if (!state) {
    state = { queue: [], timer: null, waited: 0 };
    states.set(target, state);
  }

  if (state.queue.length === 0 && hasConsentSignal(dataLayer)) {
    dataLayer.push(entry);
    return;
  }

  state.queue.push(entry);
  if (state.timer) return;

  const current = state;
  current.waited = 0;
  current.timer = setInterval(() => {
    current.waited += POLL_MS;
    if (hasConsentSignal(dataLayer) || current.waited >= MAX_WAIT_MS) {
      flush(dataLayer, current);
    }
  }, POLL_MS);
}
