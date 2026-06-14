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
    const wasDone = isQuestionDone(question);
    localStorage.setItem(getQuestionId(question), done.toString());
    window.dispatchEvent(new CustomEvent(QUESTION_PROGRESS_EVENT));
    const qid = getQuestionId(question);
    if (done && !wasDone) {
      import("@/integrations/supabase/client").then(({ supabase }) => {
        supabase.rpc("record_question_done", { _question_id: qid }).then(() => {
          window.dispatchEvent(new CustomEvent(QUESTION_PROGRESS_EVENT));
        });
      }).catch(() => {});
    } else if (!done && wasDone) {
      import("@/integrations/supabase/client").then(({ supabase }) => {
        (supabase as any).rpc("record_question_undone", { _question_id: qid }).then(() => {
          window.dispatchEvent(new CustomEvent(QUESTION_PROGRESS_EVENT));
        });
      }).catch(() => {});
    }
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

/** Collect every locally-completed question ID (the keys used in localStorage). */
export function collectLocalDoneIds(): string[] {
  const ids: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("question-") && localStorage.getItem(k) === "true") {
        ids.push(k);
      }
    }
  } catch {}
  return ids;
}

let _syncing = false;
let _lastSyncedCount = 0;

/** Push all locally-completed questions to the cloud in one batch. Safe to call repeatedly. */
export async function syncLocalProgressToCloud(): Promise<void> {
  if (_syncing) return;
  const ids = collectLocalDoneIds();
  if (ids.length === 0 || ids.length === _lastSyncedCount) return;
  _syncing = true;
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    // Chunk to keep payload reasonable
    const CHUNK = 500;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const slice = ids.slice(i, i + CHUNK);
      await (supabase as any).rpc("record_questions_done", { _question_ids: slice });
    }
    _lastSyncedCount = ids.length;
    window.dispatchEvent(new CustomEvent(QUESTION_PROGRESS_EVENT));
  } catch {} finally {
    _syncing = false;
  }
}
