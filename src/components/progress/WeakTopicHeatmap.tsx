import { useEffect, useMemo, useState } from "react";
import { getYearSubjects, type Year } from "@/lib/year-subjects";
import { collectQuestions, countDone, QUESTION_PROGRESS_EVENT } from "@/lib/question-progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface Props { year: Year; }

function colorFor(pct: number) {
  if (pct < 25) return "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40";
  if (pct < 50) return "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40";
  if (pct < 75) return "bg-lime-500/20 text-lime-700 dark:text-lime-300 border-lime-500/40";
  return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40";
}

interface SubBreakdown { name: string; done: number; total: number; pct: number; }

function breakdownOf(node: any): SubBreakdown[] {
  const subs = node?.subtopics;
  if (!subs || typeof subs !== "object") return [];
  return Object.entries(subs).map(([_, val]: any) => {
    const all = Array.from(new Set([
      ...collectQuestions(val, "essay"),
      ...collectQuestions(val, "short-notes"),
    ]));
    const total = all.length;
    const done = countDone(all);
    return { name: val?.name ?? "Untitled", done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }).filter((b) => b.total > 0);
}

const WeakTopicHeatmap = ({ year }: Props) => {
  const subjects = useMemo(() => getYearSubjects(year), [year]);
  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState<null | { name: string; node: any; done: number; total: number; pct: number }>(null);

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

  const subBreakdown = open ? breakdownOf(open.node) : [];

  return (
    <div className="rounded-2xl bg-card border p-4 animate-fade-in space-y-3" data-tour="weak-topic-heatmap">
      <div className="flex items-baseline justify-between">
        <p className="font-semibold">Weak-topic heatmap</p>
        <span className="text-[10px] text-muted-foreground">tap a tile to expand</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {cells.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setOpen({ name: c.name, node: c.node, done: c.done, total: c.total, pct: c.pct })}
            className={`text-left rounded-lg border p-3 transition hover:scale-[1.02] active:scale-95 ${colorFor(c.pct)}`}
            title={`${c.done}/${c.total} done — tap for breakdown`}
          >
            <p className="text-xs font-medium truncate">{c.name}</p>
            <p className="text-lg font-bold leading-tight">{c.pct}%</p>
          </button>
        ))}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => { if (!o) setOpen(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{open?.name}</DialogTitle>
          </DialogHeader>
          {open && (
            <div className="space-y-3">
              <div className={`rounded-lg border p-3 ${colorFor(open.pct)}`}>
                <p className="text-xs">Overall</p>
                <p className="text-2xl font-bold">{open.pct}%</p>
                <p className="text-[11px] opacity-80">{open.done} / {open.total} questions done</p>
              </div>
              {subBreakdown.length > 0 ? (
                <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                  <p className="text-[10px] tracking-widest text-muted-foreground">SUBTOPICS</p>
                  {subBreakdown
                    .sort((a, b) => a.pct - b.pct)
                    .map((s) => (
                      <div key={s.name} className="rounded-md border bg-card/50 p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">{s.name}</p>
                          <span className="text-xs font-semibold">{s.pct}%</span>
                        </div>
                        <Progress value={s.pct} className="h-1.5 mt-1" />
                        <p className="text-[10px] text-muted-foreground mt-1">{s.done} / {s.total}</p>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No subtopics found.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WeakTopicHeatmap;
