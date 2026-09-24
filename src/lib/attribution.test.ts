import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureAttribution, readAttribution, wellenaUrl } from "./attribution";

const KEY = "pz-attribution-v1";
const NOW = new Date("2026-09-24T10:00:00Z").getTime();
const DAY = 24 * 60 * 60 * 1000;

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
  };
}

let local: ReturnType<typeof memoryStorage>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  local = memoryStorage();
  vi.stubGlobal("window", { localStorage: local, location: { search: "" } });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("captureAttribution", () => {
  it("stores only utm_source and utm_content from the first visit", () => {
    captureAttribution("?utm_source=meta&utm_medium=cpc&utm_campaign=wellena-test&utm_content=H1-krok&fbclid=abc");
    expect(JSON.parse(local.values.get(KEY)!)).toEqual({
      version: 1,
      source: "meta",
      content: "H1-krok",
      firstTouchAt: NOW,
      expiresAt: NOW + 30 * DAY,
    });
    expect(local.values.get(KEY)).not.toContain("fbclid");
    expect(local.values.get(KEY)).not.toContain("cpc");
  });

  it("keeps the first source when a later visit carries other parameters", () => {
    captureAttribution("?utm_source=meta&utm_content=H1-krok");
    captureAttribution("?utm_source=newsletter&utm_content=wrzesien");
    expect(readAttribution()).toEqual({ source: "meta", content: "H1-krok" });
  });

  it("ignores values outside the allow-list and writes nothing without UTM", () => {
    captureAttribution("?utm_source=meta%3Cscript%3E&utm_content=a%20b");
    expect(local.setItem).not.toHaveBeenCalled();
    captureAttribution("?ref=x");
    expect(local.setItem).not.toHaveBeenCalled();
  });

  it("expires after 30 days", () => {
    captureAttribution("?utm_source=meta&utm_content=H1-krok");
    vi.setSystemTime(NOW + 30 * DAY + 1);
    expect(readAttribution()).toBeNull();
    expect(local.removeItem).toHaveBeenCalledWith(KEY);
  });

  it("survives denied or missing storage", () => {
    local.setItem.mockImplementation(() => {
      throw new Error("denied");
    });
    expect(() => captureAttribution("?utm_source=meta")).not.toThrow();
    vi.stubGlobal("window", undefined);
    expect(() => captureAttribution("?utm_source=meta")).not.toThrow();
    expect(readAttribution()).toBeNull();
  });
});

describe("wellenaUrl", () => {
  it("passes the remembered ad creative and the lead id to Wellena", () => {
    captureAttribution("?utm_source=meta&utm_content=H1-krok");
    const url = new URL(
      wellenaUrl({
        medium: "result",
        ctaLocation: "wynik-pytanie",
        leadId: "11111111-1111-4111-8111-111111111111",
        attribution: readAttribution(),
      }),
    );
    expect(url.origin + url.pathname).toBe("https://wellena.pl/");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      utm_source: "test",
      utm_medium: "result",
      utm_campaign: "wellena-test",
      utm_content: "H1-krok",
      lead: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("falls back to the click location and omits lead when unknown", () => {
    const url = new URL(wellenaUrl({ medium: "header", ctaLocation: "naglowek" }));
    expect(Object.fromEntries(url.searchParams)).toEqual({
      utm_source: "test",
      utm_medium: "header",
      utm_campaign: "wellena-test",
      utm_content: "naglowek",
    });
  });
});
