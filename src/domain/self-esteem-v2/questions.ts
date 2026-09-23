import type { AnswerValue, Question } from "./types";

export const TEST_VERSION = "self-esteem-v2";

export const QUESTIONS: readonly Question[] = [
  {
    id: 1,
    text: "Jest mi dobrze z tym, jaka (jaki) jestem.",
    direction: "direct",
  },
  {
    id: 2,
    text: "Każde niepowodzenie odtwarzam w głowie wiele razy.",
    direction: "reverse",
  },
  {
    id: 3,
    text: "Dostrzegam w sobie sporo zalet.",
    direction: "direct",
  },
  {
    id: 4,
    text: "To, co robię, wychodzi mi nie gorzej niż innym.",
    direction: "direct",
  },
  {
    id: 5,
    text: "Trudno mi wskazać coś, czym mogłabym (mógłbym) się naprawdę pochwalić.",
    direction: "reverse",
  },
  {
    id: 6,
    text: "Kiedy myślę o swoich marzeniach i celach, wątpię, czy dam radę je zrealizować.",
    direction: "reverse",
  },
  {
    id: 7,
    text: "Czuję, że jestem tyle samo warta (wart), co każdy inny człowiek.",
    direction: "direct",
  },
  {
    id: 8,
    text: "Żałuję, że nie traktuję samej (samego) siebie z większym szacunkiem.",
    direction: "reverse",
  },
  {
    id: 9,
    text: "W głębi duszy często czuję się osobą przegraną.",
    direction: "reverse",
  },
  {
    id: 10,
    text: "Myślę o sobie raczej dobrze niż źle.",
    direction: "direct",
  },
];

export const ANSWER_OPTIONS: readonly {
  readonly label: string;
  readonly value: AnswerValue;
}[] = [
  { label: "Zdecydowanie się nie zgadzam", value: 1 },
  { label: "Raczej się nie zgadzam", value: 2 },
  { label: "Raczej się zgadzam", value: 3 },
  { label: "Zdecydowanie się zgadzam", value: 4 },
];
