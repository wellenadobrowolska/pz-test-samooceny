import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QUESTIONS, TEST_VERSION } from "../../domain/self-esteem-v2/questions";
import type { AnswerValue } from "../../domain/self-esteem-v2/types";
import {
  clearProgress,
  persistProgress,
  persistResult,
  restoreAssessment,
} from "./progress-storage";

const PROGRESS_KEY = "pz-self-assessment-v1";
const RESULT_KEY = "pz-self-assessment-result-v1";
const NOW = new Date("2026-09-17T10:00:00Z").getTime();
const TTL = 24 * 60 * 60 * 1000;

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
  };
}

const completeAnswers = (): Array<AnswerValue | null> =>
  Array.from({ length: QUESTIONS.length }, () => 3 as AnswerValue);

function storedProgress(overrides: Record<string, unknown> = {}) {
  return {
    version: TEST_VERSION,
    answers: completeAnswers(),
    currentIndex: 9,
    stage: "email",
    expiresAt: NOW + TTL,
    ...overrides,
  };
}

let local: ReturnType<typeof memoryStorage>;
let session: ReturnType<typeof memoryStorage>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  local = memoryStorage();
  session = memoryStorage();
  vi.stubGlobal("window", { localStorage: local, sessionStorage: session });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("restoreAssessment", () => {
  it("returns null without saved data or a browser", () => {
    expect(restoreAssessment()).toBeNull();
    vi.stubGlobal("window", undefined);
    expect(restoreAssessment()).toBeNull();
    expect(() => persistResult(25)).not.toThrow();
    expect(() => persistProgress(storedProgress() as Parameters<typeof persistProgress>[0])).not.toThrow();
    expect(() => clearProgress()).not.toThrow();
  });

  it("restores a valid complete email stage", () => {
    local.values.set(PROGRESS_KEY, JSON.stringify(storedProgress()));
    expect(restoreAssessment()).toEqual({
      kind: "progress", answers: completeAnswers(), currentIndex: 9, stage: "email",
    });
  });

  it("repairs an old incomplete email stage to the first missing question", () => {
    const answers = completeAnswers();
    answers[2] = null;
    answers[7] = null;
    local.values.set(PROGRESS_KEY, JSON.stringify(storedProgress({ answers })));
    expect(restoreAssessment()).toEqual({
      kind: "progress", answers, currentIndex: 2, stage: "questions",
    });
  });

  it("restores a partial questions stage without changing its selected index", () => {
    const answers = completeAnswers();
    answers[8] = null;
    local.values.set(PROGRESS_KEY, JSON.stringify(storedProgress({
      answers, stage: "questions", currentIndex: 4,
    })));
    expect(restoreAssessment()).toEqual({
      kind: "progress", answers, currentIndex: 4, stage: "questions",
    });
  });

  it.each([
    null, [], "text", 2, {},
    storedProgress({ version: "old" }),
    storedProgress({ answers: null }),
    storedProgress({ answers: [1, 2, 3] }),
    storedProgress({ answers: [...completeAnswers().slice(0, 9), 5] }),
    storedProgress({ answers: [...completeAnswers().slice(0, 9), "3"] }),
    storedProgress({ currentIndex: -1 }),
    storedProgress({ currentIndex: 10 }),
    storedProgress({ currentIndex: 2.5 }),
    storedProgress({ currentIndex: null }),
    storedProgress({ currentIndex: "2" }),
    storedProgress({ stage: "result" }),
    storedProgress({ expiresAt: NOW }),
    storedProgress({ expiresAt: NOW - 1 }),
    storedProgress({ expiresAt: "tomorrow" }),
    storedProgress({ expiresAt: null }),
  ])("rejects malformed, expired or incompatible progress %#", (value) => {
    local.values.set(PROGRESS_KEY, JSON.stringify(value));
    expect(restoreAssessment()).toBeNull();
    expect(local.removeItem).toHaveBeenCalledWith(PROGRESS_KEY);
  });

  it.each(["{", '{"expiresAt":1e999}'])("handles invalid JSON / non-finite data: %s", (raw) => {
    local.values.set(PROGRESS_KEY, raw);
    expect(restoreAssessment()).toBeNull();
    expect(local.removeItem).toHaveBeenCalledWith(PROGRESS_KEY);
  });

  it("rejects non-finite expiry even when all other progress fields are valid", () => {
    const raw = JSON.stringify(storedProgress()).replace(String(NOW + TTL), "1e999");
    local.values.set(PROGRESS_KEY, raw);
    expect(restoreAssessment()).toBeNull();
  });

  it.each([10, 25, 40])("restores valid session result %i and clears old progress", (score) => {
    session.values.set(RESULT_KEY, JSON.stringify({ version: TEST_VERSION, score }));
    local.values.set(PROGRESS_KEY, JSON.stringify(storedProgress()));
    expect(restoreAssessment()).toEqual({ kind: "result", score });
    expect(local.values.has(PROGRESS_KEY)).toBe(false);
  });

  it.each([null, [], {}, { version: "old", score: 25 }, { version: TEST_VERSION, score: 9 },
    { version: TEST_VERSION, score: 41 }, { version: TEST_VERSION, score: 20.5 },
    { version: TEST_VERSION, score: "25" }])("ignores invalid session result %# and still restores progress", (result) => {
    session.values.set(RESULT_KEY, JSON.stringify(result));
    local.values.set(PROGRESS_KEY, JSON.stringify(storedProgress()));
    expect(restoreAssessment()?.kind).toBe("progress");
    expect(session.removeItem).toHaveBeenCalledWith(RESULT_KEY);
  });

  it("ignores corrupt result JSON and still restores progress", () => {
    session.values.set(RESULT_KEY, "{");
    local.values.set(PROGRESS_KEY, JSON.stringify(storedProgress()));
    expect(restoreAssessment()?.kind).toBe("progress");
  });
});

describe("optional storage availability", () => {
  const deny = () => { throw new Error("Storage denied"); };

  it.each(["getItem", "removeItem"] as const)("keeps a valid session result when local %s fails", (operation) => {
    session.values.set(RESULT_KEY, JSON.stringify({ version: TEST_VERSION, score: 25 }));
    local[operation].mockImplementation(deny);
    expect(restoreAssessment()).toEqual({ kind: "result", score: 25 });
  });

  it("keeps a valid session result when the localStorage getter fails", () => {
    session.values.set(RESULT_KEY, JSON.stringify({ version: TEST_VERSION, score: 25 }));
    vi.stubGlobal("window", { get localStorage() { return deny(); }, sessionStorage: session });
    expect(restoreAssessment()).toEqual({ kind: "result", score: 25 });
  });

  it("restores progress when the sessionStorage getter fails", () => {
    local.values.set(PROGRESS_KEY, JSON.stringify(storedProgress()));
    vi.stubGlobal("window", { localStorage: local, get sessionStorage() { return deny(); } });
    expect(restoreAssessment()?.kind).toBe("progress");
  });

  it("restores progress when session getItem fails", () => {
    local.values.set(PROGRESS_KEY, JSON.stringify(storedProgress()));
    session.getItem.mockImplementation(deny);
    expect(restoreAssessment()?.kind).toBe("progress");
  });

  it("does not let invalid result cleanup failure skip valid progress", () => {
    session.values.set(RESULT_KEY, "{");
    session.removeItem.mockImplementation(deny);
    local.values.set(PROGRESS_KEY, JSON.stringify(storedProgress()));
    expect(restoreAssessment()?.kind).toBe("progress");
  });

  it("handles both unavailable storage getters on every operation", () => {
    vi.stubGlobal("window", {
      get localStorage() { return deny(); },
      get sessionStorage() { return deny(); },
    });
    expect(restoreAssessment()).toBeNull();
    expect(() => persistProgress(storedProgress() as Parameters<typeof persistProgress>[0])).not.toThrow();
    expect(() => persistResult(25)).not.toThrow();
    expect(() => clearProgress()).not.toThrow();
  });

  it("handles denied reads, writes and cleanup independently", () => {
    local.getItem.mockImplementation(deny);
    expect(restoreAssessment()).toBeNull();
    local.setItem.mockImplementation(deny);
    expect(() => persistProgress(storedProgress() as Parameters<typeof persistProgress>[0])).not.toThrow();
    session.setItem.mockImplementation(deny);
    expect(() => persistResult(25)).not.toThrow();
    local.removeItem.mockImplementation(deny);
    expect(() => clearProgress()).not.toThrow();
  });

  it("handles cleanup denial on corrupt local progress", () => {
    local.values.set(PROGRESS_KEY, "null");
    local.removeItem.mockImplementation(deny);
    expect(restoreAssessment()).toBeNull();
  });
});

describe("persisting only assessment state", () => {
  it("saves only progress fields with a 24 hour expiry, never e-mail or consent", () => {
    const progress = {
      answers: completeAnswers(), currentIndex: 9, stage: "email" as const,
      email: "private@example.com", marketingConsent: true,
    };
    persistProgress(progress);
    expect(JSON.parse(local.values.get(PROGRESS_KEY)!)).toEqual(storedProgress());
    expect(local.values.get(PROGRESS_KEY)).not.toContain("private@example.com");
    expect(local.values.get(PROGRESS_KEY)).not.toContain("marketingConsent");
    expect(session.setItem).not.toHaveBeenCalled();
  });

  it("also repairs incomplete email state while persisting", () => {
    const answers = completeAnswers();
    answers[5] = null;
    persistProgress({ answers, currentIndex: 9, stage: "email" });
    expect(restoreAssessment()).toEqual({ kind: "progress", answers, currentIndex: 5, stage: "questions" });
  });

  it("saves only a validated versioned result in session storage", () => {
    persistResult(25);
    expect(JSON.parse(session.values.get(RESULT_KEY)!)).toEqual({ version: TEST_VERSION, score: 25 });
    expect(local.setItem).not.toHaveBeenCalled();
  });

  it.each([9, 41, 20.5, NaN, Infinity])("does not persist invalid score %s", (score) => {
    persistResult(score);
    expect(session.setItem).not.toHaveBeenCalled();
  });

  it("does not persist an invalid runtime progress shape", () => {
    persistProgress({ answers: completeAnswers(), currentIndex: -1, stage: "questions" });
    expect(local.setItem).not.toHaveBeenCalled();
  });

  it("does not persist sparse answers as a complete email stage", () => {
    const answers = completeAnswers();
    delete answers[2];
    persistProgress({ answers, currentIndex: 9, stage: "email" });
    expect(local.setItem).not.toHaveBeenCalled();
  });

  it("clears only assessment progress, not unrelated keys or session result", () => {
    local.values.set(PROGRESS_KEY, "progress");
    local.values.set("unrelated", "keep");
    session.values.set(RESULT_KEY, "keep result");
    clearProgress();
    expect(local.values.has(PROGRESS_KEY)).toBe(false);
    expect(local.values.get("unrelated")).toBe("keep");
    expect(session.values.get(RESULT_KEY)).toBe("keep result");
  });
});
