// Źródło wejścia na test i linki do Welleny.
//
// Po co: ścieżka „reklama → test → Wellena → zakup” ma być rozpoznawalna
// w rejestrze zamówień Welleny i w MailerLite. Test zapamiętuje, z jakiej
// reklamy przyszła osoba (utm_source, utm_content), a link do Welleny
// przekazuje to dalej razem z losowym identyfikatorem leada.
//
// Prywatność: zapisujemy WYŁĄCZNIE dwa parametry UTM z allow-listy znaków.
// Żadnych gclid/fbclid, e-maila ani wyniku. Identyfikator leada to losowy UUID.

const STORAGE_KEY = "pz-attribution-v1";
const STORAGE_TTL = 30 * 24 * 60 * 60 * 1000;
const VALUE_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

export const WELLENA_ORIGIN = "https://wellena.pl/";
export const WELLENA_CAMPAIGN = "wellena-test";

export type Attribution = { source?: string; content?: string };

type Stored = Attribution & { version: 1; firstTouchAt: number; expiresAt: number };

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Zwraca wartość tylko wtedy, gdy mieści się w allow-liście znaków. */
export function cleanValue(value: unknown): string | undefined {
  return typeof value === "string" && VALUE_PATTERN.test(value) ? value : undefined;
}

function pick(source: unknown, content: unknown): Attribution {
  const result: Attribution = {};
  const cleanSource = cleanValue(source);
  const cleanContent = cleanValue(content);
  if (cleanSource) result.source = cleanSource;
  if (cleanContent) result.content = cleanContent;
  return result;
}

/** Zapamiętuje pierwsze źródło wejścia (pierwsze wygrywa, jak `wl_first` w Wellenie). */
export function captureAttribution(search?: string): void {
  const store = storage();
  if (!store) return;

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search ?? window.location.search);
  } catch {
    return;
  }
  const incoming = pick(params.get("utm_source"), params.get("utm_content"));
  if (!incoming.source && !incoming.content) return;
  if (readAttribution()) return;

  const stored: Stored = {
    version: 1,
    ...incoming,
    firstTouchAt: Date.now(),
    expiresAt: Date.now() + STORAGE_TTL,
  };
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Pamięć przeglądarki jest opcjonalna; jej brak nie może blokować testu.
  }
}

/** Zapamiętane źródło albo null (brak, wygasłe lub uszkodzone). */
export function readAttribution(): Attribution | null {
  const store = storage();
  if (!store) return null;

  try {
    const raw = store.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      (parsed as Stored).version === 1 &&
      typeof (parsed as Stored).expiresAt === "number" &&
      (parsed as Stored).expiresAt > Date.now()
    ) {
      const clean = pick((parsed as Stored).source, (parsed as Stored).content);
      if (clean.source || clean.content) return clean;
    }
    store.removeItem(STORAGE_KEY);
  } catch {
    // Uszkodzony zapis traktujemy jak brak.
  }
  return null;
}

/**
 * Link do Welleny z oznaczeniem źródła. `utm_content` niesie kreację reklamy,
 * z której przyszła osoba; gdy jej nie znamy — miejsce kliknięcia w teście.
 * `lead` (losowy UUID) trafia tylko do Welleny, nigdy do analityki.
 *
 * Zapamiętane źródło przychodzi z zewnątrz (stan komponentu po hydracji),
 * a nie z pamięci przeglądarki w trakcie renderowania: serwer jej nie ma,
 * a React nie poprawia atrybutów, które różnią się przy hydracji.
 */
export function wellenaUrl(input: {
  medium: "result" | "header";
  ctaLocation: string;
  leadId?: string | null;
  attribution?: Attribution | null;
}): string {
  const remembered = input.attribution;
  const url = new URL(WELLENA_ORIGIN);
  url.searchParams.set("utm_source", "test");
  url.searchParams.set("utm_medium", input.medium);
  url.searchParams.set("utm_campaign", WELLENA_CAMPAIGN);
  url.searchParams.set("utm_content", remembered?.content ?? input.ctaLocation);
  if (input.leadId) url.searchParams.set("lead", input.leadId);
  return url.toString();
}
