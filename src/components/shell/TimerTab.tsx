import { useEffect } from "react";
import { Timer as TimerIcon, Play } from "lucide-react";
import { usePomodoroStats, formatFocusTime } from "@/hooks/use-pomodoro-stats";

export default function TimerTab() {
  useEffect(() => {
    // Ensure the floating Pomodoro widget is visible when this tab opens.
    window.dispatchEvent(new CustomEvent("orbit:show-pomodoro"));
  }, []);

  const { todayMinutes, weeklyMinutes } = usePomodoroStats();

  return (
    <div className="space-y-4 pb-4">
      <header className="pt-2">
        <h1 className="text-2xl font-extrabold">Focus Timer</h1>
        <p className="text-sm text-muted-foreground">Pomodoro focus & break cycles</p>
      </header>

      <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-primary/5 p-8 flex flex-col items-center text-center">
        <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center shadow-[0_0_40px_hsl(var(--primary)/0.5)]">
          <TimerIcon className="h-10 w-10" />
        </div>
        <h2 className="mt-5 text-xl font-bold">Pomodoro Timer</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-xs">
          The timer is docked to the bottom of your screen. Drag it anywhere or tap to start focusing.
        </p>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("orbit:show-pomodoro"))}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold shadow-lg hover:opacity-90 transition"
        >
          <Play className="h-4 w-4" /> Show Timer
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs text-muted-foreground">Today</p>
          <p className="text-2xl font-extrabold text-primary">{formatFocusTime(todayMinutes)}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs text-muted-foreground">This week</p>
          <p className="text-2xl font-extrabold text-primary">{formatFocusTime(weeklyMinutes)}</p>
        </div>
      </div>
    </div>
  );
}
