import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useProfile } from "@/hooks/use-profile";
import { useExamTarget } from "@/hooks/use-exam-target";
import { differenceInCalendarDays, format } from "date-fns";
import { CalendarClock } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { getThemeGradient } from "@/lib/theme-gradients";

const STORAGE_KEY = "orbit.examReminder.lastShown";

const todayIstStr = () =>
  new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

const ExamReminderPopup = () => {
  const { userId, local } = useProfile();
  const year = local?.year ?? "first";
  const { target } = useExamTarget(userId, year);
  const { theme } = useTheme();
  const grad = getThemeGradient(theme);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!target?.exam_date) return;
    const days = differenceInCalendarDays(
      new Date(target.exam_date + "T00:00:00"),
      new Date()
    );
    if (days < 0) return; // exam expired
    const today = todayIstStr();
    const key = `${STORAGE_KEY}:${target.id}:${today}`;
    if (localStorage.getItem(key)) return;
    const t = setTimeout(() => {
      setOpen(true);
      localStorage.setItem(key, "1");
    }, 1200);
    return () => clearTimeout(t);
  }, [target?.id, target?.exam_date]);

  if (!target?.exam_date) return null;
  const days = differenceInCalendarDays(
    new Date(target.exam_date + "T00:00:00"),
    new Date()
  );
  const pretty = format(new Date(target.exam_date + "T00:00:00"), "dd MMM yyyy");
  const title = target.label?.trim() || "Your exam";

  const headline =
    days === 0
      ? "Today's the day! 🎯"
      : days === 1
        ? "1 day to go 🔥"
        : `${days} days to go`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xs text-center border-0 overflow-hidden p-0">
        <div className={`${grad.bg} p-[2px] rounded-lg`}>
          <div className="bg-card rounded-[6px] p-6 space-y-3">
            <div className="text-5xl animate-scale-in">📅</div>
            <h2 className={`text-xl font-bold bg-clip-text text-transparent ${grad.text}`}>
              {headline}
            </h2>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" /> {pretty}
            </p>
            <button
              onClick={() => setOpen(false)}
              className="mt-2 w-full rounded-md bg-primary text-primary-foreground py-2 text-sm font-medium"
            >
              Let's study
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExamReminderPopup;
