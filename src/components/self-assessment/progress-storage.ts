import { QUESTIONS, TEST_VERSION } from "../../domain/self-esteem-v1/questions";
import { isAnswerValue } from "../../domain/self-esteem-v1/score";
import type { AnswerValue } from "../../domain/self-esteem-v1/types";

const STORAGE_KEY = "pz-self-assessment-v1";
const RESULT_STORAGE_KEY = "pz-self-assessment-result-v1";
const STORAGE_TTL = 24 * 60 * 60 * 1000;

type Progress = {
  answers: Array<AnswerValue | null>;
  currentIndex: number;
  stage: "questions" | "email";
};

type RestoredAssessment =
  | { kind: "result"; score: number }
  | ({ kind: "progress" } & Progress);

function getStorage(name: "localStorage" | "sessionStorage"): Storage | null {
  try {
    return typeof window === "undefined" ? null : window[name];
  } catch {
    return null;
  }
}

function readItem(storage: Storage | null, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeItem(storage: Storage | null, key: string, value: string): void {
  try {
    storage?.setItem(key, value);
  } catch {
    // Browser storage is optional; its availability must not block the test.
  }
}

function removeItem(storage: Storage | null, key: string): void {
  try {
    storage?.removeItem(key);
  } catch {
    // Clearing denied or unavailable storage is best-effort.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isScore(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 10 && value <= 40;
}

function isProgress(value: unknown): value is Progress {
  if (!isRecord(value)) return false;

  return (
    Array.isArray(value.answers) &&
    value.answers.length === QUESTIONS.length &&
    Array.from(value.answers).every((answer: unknown) => answer === null || isAnswerValue(answer)) &&
    typeof value.currentIndex === "number" &&
    Number.isInteger(value.currentIndex) &&
    value.currentIndex >= 0 &&
    value.currentIndex < QUESTIONS.length &&
    (value.stage === "questions" || value.stage === "email")
  );
}

function normalizeProgress(progress: Progress): Progress {
  const answers = [...progress.answers];
  const firstMissing = answers.findIndex((answer) => answer === null);

  if (progress.stage === "email" && firstMissing !== -1) {
    return { answers, currentIndex: firstMissing, stage: "questions" };
  }

  return { answers, currentIndex: progress.currentIndex, stage: progress.stage };
}

export function restoreAssessment(): RestoredAssessment | null {
  const session = getStorage("sessionStorage");
  const rawResult = readItem(session, RESULT_STORAGE_KEY);

  if (rawResult !== null) {
    try {
      const result: unknown = JSON.parse(rawResult);
      if (isRecord(result) && result.version === TEST_VERSION && isScore(result.score)) {
        clearProgress();
        return { kind: "result", score: result.score };
      }
    } catch {
      // Invalid JSON is treated in the same way as an invalid stored shape.
    }

    removeItem(session, RESULT_STORAGE_KEY);
  }

  const local = getStorage("localStorage");
  const rawProgress = readItem(local, STORAGE_KEY);
  if (rawProgress === null) return null;

  try {
    const progress: unknown = JSON.parse(rawProgress);
    if (
      isRecord(progress) &&
      progress.version === TEST_VERSION &&
      typeof progress.expiresAt === "number" &&
      Number.isFinite(progress.expiresAt) &&
      progress.expiresAt > Date.now() &&
      isProgress(progress)
    ) {
      return { kind: "progress", ...normalizeProgress(progress) };
    }
  } catch {
    // Corrupt progress must not prevent starting a new assessment.
  }

  removeItem(local, STORAGE_KEY);
  return null;
}

export function persistProgress(progress: Progress): void {
  if (!isProgress(progress)) return;

  // Only these explicit fields are saved: never e-mail or consent details.
  const stored = {
    version: TEST_VERSION,
    ...normalizeProgress(progress),
    expiresAt: Date.now() + STORAGE_TTL,
  };
  writeItem(getStorage("localStorage"), STORAGE_KEY, JSON.stringify(stored));
}

export function persistResult(score: number): void {
  if (!isScore(score)) return;

  writeItem(
    getStorage("sessionStorage"),
    RESULT_STORAGE_KEY,
    JSON.stringify({ version: TEST_VERSION, score }),
  );
}

export function clearProgress(): void {
  removeItem(getStorage("localStorage"), STORAGE_KEY);
}
