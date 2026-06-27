import { useEffect, useMemo, useState } from "react";
import { getYearSubjects, type Year } from "@/lib/year-subjects";
import { collectQuestions, countDone, QUESTION_PROGRESS_EVENT } from "@/lib/question-progress";

interface Props { year: Year; }

function colorFor(pct: number) {
  if (pct < 25) return "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40";
  if (pct < 50) return "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40";
  if (pct < 75) return "bg-lime-500/20 text-lime-700 dark:text-lime-300 border-lime-500/40";
  return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40";
}

const WeakTopicHeatmap = ({ year }: Props) => {
  const subjects = useMemo(() => getYearSubjects(year), [year]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const h = () => setTick((t) => t + 1);
    window.addEventListener(QUESTION_PROGRESS_EVENT, h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener(QUESTION_PROGRESS_EVENT, h);
      window.removeEventListener("storage", h);
    };
  }, []);

  const cells = useMemo(() => subjects.map((s) => {
    const all = Array.from(new Set([
      ...collectQuestions(s.node, "essay"),
      ...collectQuestions(s.node, "short-notes"),
    ]));
    const total = all.length;
    const done = countDone(all);
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { ...s, total, done, pct };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [subjects, tick]);

  if (cells.length === 0) return null;

  return (
    <div className="rounded-2xl bg-card border p-4 animate-fade-in space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="font-semibold">Weak-topic heatmap</p>
        <span className="text-[10px] text-muted-foreground">red = weak · green = strong</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {cells.map((c) => (
          <div
            key={c.key}
            className={`rounded-lg border p-3 transition hover:scale-[1.02] ${colorFor(c.pct)}`}
            title={`${c.done}/${c.total} done`}
          >
            <p className="text-xs font-medium truncate">{c.name}</p>
            <p className="text-lg font-bold leading-tight">{c.pct}%</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeakTopicHeatmap;
