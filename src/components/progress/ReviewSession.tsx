import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { lookupQuestion } from "@/lib/question-lookup";
import type { DueRow } from "@/hooks/use-revision-queue";

interface Props {
  open: boolean;
  onClose: () => void;
  due: DueRow[];
  onGrade: (qid: string, g: "again" | "hard" | "good" | "easy") => Promise<void>;
}

const GRADE_META: { g: "again" | "hard" | "good" | "easy"; label: string; cls: string }[] = [
  { g: "again", label: "Again · 1d", cls: "bg-red-500 hover:bg-red-600 text-white" },
  { g: "hard", label: "Hard", cls: "bg-amber-500 hover:bg-amber-600 text-white" },
  { g: "good", label: "Good", cls: "bg-emerald-500 hover:bg-emerald-600 text-white" },
  { g: "easy", label: "Easy", cls: "bg-sky-500 hover:bg-sky-600 text-white" },
];

const ReviewSession = ({ open, onClose, due, onGrade }: Props) => {
  const [i, setI] = useState(0);
  const [reveal, setReveal] = useState(false);
  const current = due[i];

  const handle = async (g: "again" | "hard" | "good" | "easy") => {
    if (!current) return;
    await onGrade(current.question_id, g);
    setReveal(false);
    if (i + 1 >= due.length) {
      setI(0);
      onClose();
    } else {
      setI(i + 1);
    }
  };

  const meta = current ? lookupQuestion(current.question_id) : null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setI(0); setReveal(false); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Revise · {i + 1} / {due.length}</DialogTitle>
        </DialogHeader>
        {current ? (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground">
              {meta?.subject ?? "Question"} · interval {current.interval_days}d
            </div>
            <div className="rounded-lg border p-4 bg-card">
              <p className="font-medium">
                {meta?.question ?? <span className="text-muted-foreground italic">Question not found locally — grade anyway to reschedule.</span>}
              </p>
              {reveal && meta && (
                <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                  Tap a grade based on how confident you felt. Good = standard, Easy = trivial.
                </p>
              )}
            </div>
            {!reveal ? (
              <Button onClick={() => setReveal(true)} className="w-full">Show answer</Button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {GRADE_META.map((m) => (
                  <Button key={m.g} onClick={() => handle(m.g)} className={m.cls}>
                    {m.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing due. 🎉</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReviewSession;
