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
    return { done: countDone(questions), total: questions.length };
  }, [questions]);
  
  const [stats, setStats] = useState(compute);

  useEffect(() => {
    const update = () => {
      const next = compute();
      setStats(prev => {
        if (prev.done === next.done && prev.total === next.total) return prev;
        return next;
      });
    };
    
    update();
    window.addEventListener(QUESTION_PROGRESS_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(QUESTION_PROGRESS_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, [compute]);

  return stats;
}
