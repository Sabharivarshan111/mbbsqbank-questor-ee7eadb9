type Tab = "essay" | "short-notes";

export const QUESTION_PROGRESS_EVENT = "question-progress-change";

export function getQuestionId(question: string): string {
  return `question-${question.slice(0, 50).replace(/\s+/g, "-")}`;
}

export function isQuestionDone(question: string): boolean {
  try {
    return localStorage.getItem(getQuestionId(question)) === "true";
  } catch {
    return false;
  }
}

export function setQuestionDone(question: string, done: boolean) {
  try {
    localStorage.setItem(getQuestionId(question), done.toString());
    window.dispatchEvent(new CustomEvent(QUESTION_PROGRESS_EVENT));
  } catch {}
}

/** Collect all question strings under a node for a given tab. */
export function collectQuestions(node: any, tab: Tab): string[] {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node.questions)) return node.questions as string[];
  if (node.subtopics && typeof node.subtopics === "object") {
    return collectQuestions(node.subtopics, tab);
  }
  const out: string[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === "name") continue;
    if (tab === "essay") {
      if (key === "essay") out.push(...collectQuestions(value, tab));
      else if (key !== "short-note" && key !== "short-notes")
        out.push(...collectQuestions(value, tab));
    } else {
      if (key === "short-note" || key === "short-notes")
        out.push(...collectQuestions(value, tab));
      else if (key !== "essay") out.push(...collectQuestions(value, tab));
    }
  }
  return out;
}

export function countDone(questions: string[]): number {
  let n = 0;
  for (const q of questions) if (isQuestionDone(q)) n++;
  return n;
}
