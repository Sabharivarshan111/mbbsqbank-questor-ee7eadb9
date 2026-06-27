import { useState } from "react";
import { Brain, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRevisionQueue } from "@/hooks/use-revision-queue";
import ReviewSession from "./ReviewSession";

interface Props { userId: string | null; year: string; }

const ReviseDueCard = ({ userId, year }: Props) => {
  const { due, grade } = useRevisionQueue(userId, year);
  const [open, setOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const overdue = due.filter((d) => d.due_date < today).length;

  return (
    <>
      <div className="rounded-2xl bg-card border p-4 animate-fade-in flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
          <Brain className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold flex items-center gap-2">
            Spaced revision
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">SR · SM-2</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {due.length === 0
              ? "No reviews due — tick questions to enroll them."
              : <><CalendarCheck className="h-3 w-3 inline mr-1" />{due.length} due{overdue ? ` · ${overdue} overdue` : ""}</>}
          </p>
        </div>
        <Button size="sm" disabled={due.length === 0} onClick={() => setOpen(true)}>
          Revise
        </Button>
      </div>
      <ReviewSession open={open} onClose={() => setOpen(false)} due={due} onGrade={grade} />
    </>
  );
};

export default ReviseDueCard;
