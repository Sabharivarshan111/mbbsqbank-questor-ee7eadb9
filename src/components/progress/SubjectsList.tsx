import { useEffect, useMemo, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { FlaskConical } from "lucide-react";
import type { Year } from "@/lib/year-subjects";
import { getYearSubjects } from "@/lib/year-subjects";
import { collectQuestions, countDone, QUESTION_PROGRESS_EVENT } from "@/lib/question-progress";

interface Props {
  year: Year;
}

const SubjectsList = ({ year }: Props) => {
  const subjects = useMemo(() => getYearSubjects(year), [year]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    window.addEventListener(QUESTION_PROGRESS_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(QUESTION_PROGRESS_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return (
    <div className="space-y-3">
      <p className="text-xs tracking-widest text-muted-foreground">SUBJECTS</p>
      {subjects.map((s) => {
        // include both essay and short-notes questions
        const allQs = [
          ...collectQuestions(s.node, "essay"),
          ...collectQuestions(s.node, "short-notes"),
        ];
        const unique = Array.from(new Set(allQs));
        const total = unique.length;
        const done = countDone(unique);
        const pct = total ? Math.round((done / total) * 100) : 0;
        return (
          <div key={s.key + tick} className="rounded-xl bg-card border p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium truncate">{s.name}</p>
                <span className="text-xs font-semibold text-primary">{pct}%</span>
              </div>
              <Progress value={pct} className="h-1.5 mt-1" />
              <p className="text-[11px] text-muted-foreground mt-1">{done} / {total} questions</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SubjectsList;
