import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type AnalyticsTarget, toDataLayerEntry, trackEvent } from "./analytics";

const consent = { event: "cookie_consent_update" };

describe("toDataLayerEntry", () => {
  it("sends only the test version and question number", () => {
    expect(
      toDataLayerEntry({
        event: "self_assessment_question_view",
        testVersion: "self-esteem-v1",
        questionNumber: 3,
      }),
    ).toEqual({
      event: "self_assessment_question_view",
      test_version: "self-esteem-v1",
      question_number: 3,
    });
  });

  it("never carries score, answers or e-mail keys", () => {
    const entry = toDataLayerEntry({
      event: "self_assessment_email_submit",
      testVersion: "self-esteem-v1",
      // Pola spoza typu nie mogą przeciec do dataLayer.
      ...({ score: 33, email: "a@b.pl", answers: [1, 2] } as object),
    } as Parameters<typeof toDataLayerEntry>[0]);
    expect(Object.keys(entry).sort()).toEqual(["event", "test_version"]);
  });

  it("describes a Wellena click with the shared parameter names", () => {
    expect(
      toDataLayerEntry({
        event: "wellena_cta_click",
        ctaLocation: "wynik-most",
        linkUrl: "https://wellena.pl/",
        linkText: "  Zobacz, jak\n działa Wellena ",
      }),
    ).toEqual({
      event: "wellena_cta_click",
      source_page: "test-samooceny",
      cta_location: "wynik-most",
      link_url: "https://wellena.pl/",
      link_text: "Zobacz, jak działa Wellena",
    });
  });
});

describe("toDataLayerEntry privacy", () => {
  it("strips the lead id and UTM from the Wellena link before it reaches analytics", () => {
    const entry = toDataLayerEntry({
      event: "wellena_cta_click",
      ctaLocation: "wynik-program",
      linkUrl: "https://wellena.pl/?utm_source=test&utm_content=H1-krok&lead=11111111-1111-4111-8111-111111111111",
      linkText: "Zrób kolejny krok",
    });
    expect(entry.link_url).toBe("https://wellena.pl/");
    expect(JSON.stringify(entry)).not.toContain("lead=");
  });
});

describe("trackEvent", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const view = { event: "self_assessment_view", testVersion: "v" } as const;
  const start = { event: "self_assessment_start", testVersion: "v" } as const;

  it("pushes at once when the consent signal is already there", () => {
    const target: AnalyticsTarget = { dataLayer: [consent] };
    trackEvent(view, target);
    expect(target.dataLayer).toEqual([
      consent,
      { event: "self_assessment_view", test_version: "v" },
    ]);
  });

  it("waits for the consent signal and keeps the order", () => {
    const target: AnalyticsTarget = { dataLayer: [] };
    trackEvent(view, target);
    trackEvent(start, target);
    expect(target.dataLayer).toEqual([]);

    target.dataLayer!.push(consent);
    vi.advanceTimersByTime(100);

    expect(target.dataLayer!.map((e) => (e as { event: string }).event)).toEqual([
      "cookie_consent_update",
      "self_assessment_view",
      "self_assessment_start",
    ]);
  });

  it("gives up waiting after 5 seconds", () => {
    const target: AnalyticsTarget = {};
    trackEvent(view, target);
    vi.advanceTimersByTime(4900);
    expect(target.dataLayer).toEqual([]);
    vi.advanceTimersByTime(100);
    expect(target.dataLayer).toHaveLength(1);
  });
});
