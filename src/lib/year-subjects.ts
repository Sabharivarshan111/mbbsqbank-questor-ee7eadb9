import { QUESTION_BANK_DATA } from "@/data/questionBankData";

export type Year = "first" | "second" | "third" | "final";

export const YEAR_LABELS: Record<Year, string> = {
  first: "1st Year",
  second: "2nd Year",
  third: "3rd Year",
  final: "Final Year",
};

const YEAR_KEY: Record<Year, keyof typeof QUESTION_BANK_DATA> = {
  first: "first-year",
  second: "second-year",
  third: "third-year",
  final: "final-year",
};

export function getYearNode(year: Year) {
  return QUESTION_BANK_DATA[YEAR_KEY[year]];
}

export function getYearSubjects(year: Year) {
  const node = getYearNode(year);
  return Object.entries(node.subtopics).map(([key, val]: any) => ({
    key,
    name: val.name as string,
    node: val,
  }));
}
