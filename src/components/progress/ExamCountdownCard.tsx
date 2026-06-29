import { useMemo, useState } from "react";
import { CalendarClock, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useExamTarget } from "@/hooks/use-exam-target";
import { type Year } from "@/lib/year-subjects";
import { format, differenceInCalendarDays } from "date-fns";

interface Props { userId: string | null; year: Year; }

const ExamCountdownCard = ({ userId, year }: Props) => {
  const { target, save, clear } = useExamTarget(userId, year);
  const [editing, setEditing] = useState(false);
  const [draftDate, setDraftDate] = useState("");
  const [draftLabel, setDraftLabel] = useState("");

  const daysLeft = useMemo(() => {
    if (!target?.exam_date) return null;
    const d = differenceInCalendarDays(new Date(target.exam_date + "T00:00:00"), new Date());
    return d;
  }, [target?.exam_date]);

  const startEdit = () => {
    setDraftDate(target?.exam_date ?? "");
    setDraftLabel(target?.label ?? "");
    setEditing(true);
  };
  const submit = async () => {
    if (!draftDate) return;
    await save(draftDate, draftLabel.trim() || null);
    setEditing(false);
  };

  const examPretty = target?.exam_date
    ? format(new Date(target.exam_date + "T00:00:00"), "dd MMM yyyy")
    : null;

  return (
    <div className="rounded-2xl bg-card border p-4 animate-fade-in" data-tour="exam-countdown">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-rose-500/20 to-orange-400/20 flex items-center justify-center text-rose-600 dark:text-rose-300 flex-shrink-0">
          <CalendarClock className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">
            {target?.label ? target.label : "Exam countdown"}
          </p>
          {!target && !editing && (
            <p className="text-xs text-muted-foreground">Set your exam date to see a daily countdown.</p>
          )}
          {target && !editing && daysLeft !== null && (
            <p className="text-xs text-muted-foreground">
              📅 {examPretty}
              {daysLeft > 0 && <> · D-{daysLeft}</>}
              {daysLeft === 0 && <> · <span className="text-rose-500 font-medium">Today 🎯</span></>}
              {daysLeft < 0 && <> · <span className="text-muted-foreground">passed</span></>}
            </p>
          )}
        </div>

        {!editing && (
          target ? (
            <div className="flex gap-1 flex-shrink-0">
              <Button size="icon" variant="ghost" onClick={startEdit}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={clear}><X className="h-4 w-4" /></Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={startEdit} className="flex-shrink-0">Set date</Button>
          )
        )}
      </div>
      {editing && (
        <div className="space-y-2 mt-3">
          <Input
            placeholder="Exam name (e.g. Anatomy Paper 1)"
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value.slice(0, 60))}
          />
          <div className="flex gap-2">
            <Input
              type="date"
              value={draftDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDraftDate(e.target.value)}
            />
            <Button size="sm" onClick={submit} disabled={!draftDate}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamCountdownCard;
