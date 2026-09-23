export type AnswerValue = 1 | 2 | 3 | 4;

export type QuestionDirection = "direct" | "reverse";

export type Question = {
  readonly id: number;
  readonly text: string;
  readonly direction: QuestionDirection;
};
