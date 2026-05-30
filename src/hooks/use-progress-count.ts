import { useEffect, useState } from "react";
import {
  QUESTION_PROGRESS_EVENT,
  collectQuestions,
  countDone,
} from "@/lib/question-progress";

type Tab = "essay" | "short-notes";

export function useProgressCount(node: any, tab: Tab) {
  const compute = () => {
    const qs = collectQuestions(node, tab);
    return { done: countDone(qs), total: qs.length };
  };
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
  }, [node, tab]);

  return stats;
}
