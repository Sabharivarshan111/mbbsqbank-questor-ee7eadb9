import { QUESTION_BANK_DATA } from "@/data/questionBankData";
import { getQuestionId } from "@/lib/question-progress";

let _cache: Map<string, { question: string; year: string; subject: string; tab: "essay" | "short-notes" }> | null = null;

const YEAR_NAMES: Record<string, string> = {
  "first-year": "first",
  "second-year": "second",
  "third-year": "third",
  "final-year": "final",
};

function walk(
  node: any,
  year: string,
  subject: string,
  tab: "essay" | "short-notes",
  out: Map<string, any>,
) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node.questions)) {
    for (const q of node.questions) {
      if (typeof q === "string") {
        out.set(getQuestionId(q), { question: q, year, subject, tab });
      }
    }
    return;
  }
  if (node.subtopics && typeof node.subtopics === "object") {
    walk(node.subtopics, year, subject, tab, out);
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === "name") continue;
    let nextTab = tab;
    if (key === "essay") nextTab = "essay";
    else if (key === "short-note" || key === "short-notes") nextTab = "short-notes";
    walk(value, year, subject, nextTab, out);
  }
}

function buildCache() {
  const m = new Map<string, any>();
  for (const [yKey, yNode] of Object.entries(QUESTION_BANK_DATA)) {
    const year = YEAR_NAMES[yKey] ?? yKey;
    for (const [sKey, sNode] of Object.entries((yNode as any).subtopics)) {
      const subjectName = (sNode as any).name ?? sKey;
      walk(sNode, year, subjectName, "essay", m);
    }
  }
  _cache = m;
}

export function lookupQuestion(qid: string) {
  if (!_cache) buildCache();
  return _cache!.get(qid) ?? null;
}
