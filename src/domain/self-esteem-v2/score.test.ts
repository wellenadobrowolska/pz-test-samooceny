import { describe, expect, it } from "vitest";
import { scoreAnswers, scoreProgress } from "./score";
import type { AnswerValue } from "./types";

const vector = (...answers: AnswerValue[]) => answers;

describe("scoreAnswers", () => {
  it.each([
    ["T1 — minimum", vector(1, 4, 1, 1, 4, 4, 1, 4, 4, 1), 10],
    ["T2 — maximum", vector(4, 1, 4, 4, 1, 1, 4, 1, 1, 4), 40],
    ["T3 — mixed", vector(3, 2, 3, 4, 1, 2, 4, 3, 1, 3), 33],
    ["T4 — all agree", vector(4, 4, 4, 4, 4, 4, 4, 4, 4, 4), 25],
    ["T5 — all disagree", vector(1, 1, 1, 1, 1, 1, 1, 1, 1, 1), 25],
    ["T6 — all two", vector(2, 2, 2, 2, 2, 2, 2, 2, 2, 2), 25],
  ])("passes %s", (_name, answers, expected) => {
    expect(scoreAnswers(answers as AnswerValue[])).toBe(expected);
  });

  it("rejects an incomplete response", () => {
    expect(() => scoreAnswers(vector(1, 2, 3))).toThrow("Expected 10 answers");
  });

  it("rejects a value outside the scale", () => {
    const invalid = [1, 2, 3, 4, 1, 2, 3, 4, 1, 5] as AnswerValue[];
    expect(() => scoreAnswers(invalid)).toThrow("must be an integer from 1 to 4");
  });
});

describe("scoreProgress", () => {
  it.each([
    [10, 0],
    [25, 0.5],
    [40, 1],
  ])("maps score %i to %f of the result arc", (score, expected) => {
    expect(scoreProgress(score)).toBe(expected);
  });

  it.each([9, 40.5, 41])("rejects invalid score %s", (score) => {
    expect(() => scoreProgress(score)).toThrow(
      "Score must be an integer from 10 to 40",
    );
  });
});
