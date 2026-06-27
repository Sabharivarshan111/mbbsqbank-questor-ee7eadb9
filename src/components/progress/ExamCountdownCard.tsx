import { useMemo, useState } from "react";
import { CalendarClock, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deriveDailyTarget, useExamTarget } from "@/hooks/use-exam-target";
import { getYearNode, type Year } from "@/lib/year-subjects";
import { collectQuestions, countDone } from "@/lib/question-progress";

interface Props { userId: string | null; year: Year; }

const ExamCountdownCard = ({ userId, year }: Props) => {
  const { target, doneToday, save, clear } = useExamTarget(userId, year);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const { total, completed } = useMemo(() => {
    const node = getYearNode(year);
    const all = Array.from(new Set([
      ...collectQuestions(node, "essay"),
      ...collectQuestions(node, "short-notes"),
    ]));
    return { total: all.length, completed: countDone(all) };
  }, [year]);

  const derived = deriveDailyTarget({
    examDateISO: target?.exam_date,
    totalQuestions: total,
    completedQuestions: completed,
    doneToday,
  });

  const startEdit = () => {
    setDraft(target?.exam_date ?? "");
    setEditing(true);
  };
  const submit = async () => {
    if (!draft) return;
    await save(draft);
    setEditing(false);
  };

  return (
    <div className="rounded-2xl bg-card border p-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-rose-500/20 to-orange-400/20 flex items-center justify-center text-rose-600 dark:text-rose-300">
          <CalendarClock className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold">Exam countdown</p>
          {!target && !editing && (
            <p className="text-xs text-muted-foreground">Set your exam date to get a daily target.</p>
          )}
          {target && !editing && derived && (
            <p className="text-xs text-muted-foreground">
              D-{derived.daysLeft} · target {derived.perDay} Q/day ·{" "}
              <span className={derived.leftToday === 0 ? "text-emerald-500 font-medium" : ""}>
                {derived.leftToday === 0 ? "done today 🎉" : `${derived.leftToday} left today`}
              </span>
            </p>
          )}
        </div>
        {!editing && (
          target ? (
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={startEdit}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={clear}><X className="h-4 w-4" /></Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={startEdit}>Set date</Button>
          )
        )}
      </div>
      {editing && (
        <div className="flex gap-2 mt-3">
          <Input
            type="date"
            value={draft}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button size="sm" onClick={submit} disabled={!draft}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      )}
    </div>
  );
};

export default ExamCountdownCard;
