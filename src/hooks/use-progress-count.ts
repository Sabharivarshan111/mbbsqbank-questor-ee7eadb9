import { useCallback, useEffect, useMemo, useState } from "react";
import {
  QUESTION_PROGRESS_EVENT,
  collectQuestions,
  countDone,
} from "@/lib/question-progress";

type Tab = "essay" | "short-notes";

export function useProgressCount(node: any, tab: Tab) {
  const questions = useMemo(() => collectQuestions(node, tab), [node, tab]);
  const compute = useCallback(() => {
    const qs = questions;
    return { done: countDone(qs), total: qs.length };
  }, [questions]);
  const [stats, setStats] = useState(compute);

  useEffect(() => {
    const update = () => setStats(compute());
    update();
    window.addEventListener(QUESTION_PROGRESS_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(QUESTION_PROGRESS_EVENT, update);
      window.removeEventListener("storage", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compute]);

  return stats;
}
