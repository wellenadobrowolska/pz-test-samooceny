import { QUESTIONS } from "./questions";
import type { AnswerValue } from "./types";

const MIN_SCORE = 10;
const MAX_SCORE = 40;

export function isAnswerValue(value: unknown): value is AnswerValue {
  return Number.isInteger(value) && [1, 2, 3, 4].includes(value as number);
}

export function scoreAnswers(answers: readonly AnswerValue[]): number {
  if (answers.length !== QUESTIONS.length) {
    throw new Error(`Expected ${QUESTIONS.length} answers, received ${answers.length}.`);
  }

  return answers.reduce((total, answer, index) => {
    if (!isAnswerValue(answer)) {
      throw new Error(`Answer ${index + 1} must be an integer from 1 to 4.`);
    }

    const points =
      QUESTIONS[index].direction === "reverse" ? 5 - answer : answer;

    return total + points;
  }, 0);
}

export function scoreProgress(score: number): number {
  if (!Number.isInteger(score) || score < MIN_SCORE || score > MAX_SCORE) {
    throw new Error(`Score must be an integer from ${MIN_SCORE} to ${MAX_SCORE}.`);
  }

  return (score - MIN_SCORE) / (MAX_SCORE - MIN_SCORE);
}
