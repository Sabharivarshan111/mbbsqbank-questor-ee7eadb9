import { useEffect } from "react";
import { Play, Pause, RotateCcw, Settings2, Coffee, Timer as TimerIcon, Sparkles } from "lucide-react";
import { usePomodoroCtx } from "@/hooks/pomodoro-context";
import { formatFocusTime } from "@/hooks/use-pomodoro-stats";
import { primeAudio } from "@/lib/timer-sounds";
import { cn } from "@/lib/utils";
import type { PomodoroMode } from "@/hooks/use-pomodoro-timer";

const MODE_META: Record<PomodoroMode, { label: string; emoji: string; sub: string }> = {
  focus: { label: "Focus", emoji: "🍅", sub: "Deep work session" },
  short: { label: "Short break", emoji: "☕", sub: "Stretch & breathe" },
  long: { label: "Long break", emoji: "🌿", sub: "Rest and reset" },
};

export default function TimerTab() {
  const {
    mode,
    minutes,
    seconds,
    isRunning,
    progressPercentage,
    pomodoroCount,
    settings,
    todayMinutes,
    toggleTimer,
    resetTimer,
    switchMode,
  } = usePomodoroCtx();

  // Ensure the floating pill is hidden while the full-screen tab is open.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("orbit:hide-pomodoro"));
  }, []);

  const meta = MODE_META[mode];
  const size = 260;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * (1 - progressPercentage / 100);

  const handleToggle = () => {
    primeAudio();
    toggleTimer();
  };

  return (
    <div className="space-y-5 pb-6">
      <header className="pt-2 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Focus Timer</h1>
          <p className="text-sm text-muted-foreground">{meta.sub}</p>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("orbit:open-pomodoro-settings"))}
          className="h-10 w-10 rounded-full border border-border/60 bg-card flex items-center justify-center hover:bg-accent transition"
          aria-label="Timer settings"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </header>

      {/* Mode switcher */}
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-card border border-border/60 p-1">
        {(Object.keys(MODE_META) as PomodoroMode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={cn(
              "rounded-xl py-2 text-xs font-semibold transition",
              mode === m
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {MODE_META[m].emoji} {MODE_META[m].label}
          </button>
        ))}
      </div>

      {/* Big timer ring */}
      <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-primary/5 p-6 flex flex-col items-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={stroke}
              className="stroke-border/40 fill-none"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dash}
              className="stroke-primary fill-none transition-all duration-500"
              style={{ filter: "drop-shadow(0 0 12px hsl(var(--primary)/0.55))" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              {meta.emoji} {meta.label}
            </span>
            <span className="mt-1 font-mono text-5xl font-extrabold tabular-nums">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
            <span className="mt-1 text-[11px] text-muted-foreground">
              🍅 {pomodoroCount % settings.longEvery}/{settings.longEvery} to long break
            </span>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={resetTimer}
            className="h-12 w-12 rounded-full border border-border/60 bg-card flex items-center justify-center hover:bg-accent transition"
            aria-label="Reset"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <button
            onClick={handleToggle}
            className={cn(
              "h-16 w-16 rounded-full flex items-center justify-center shadow-lg transition",
              "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground",
              isRunning && "ring-4 ring-primary/30",
            )}
            aria-label={isRunning ? "Pause" : "Start"}
          >
            {isRunning ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-0.5" />}
          </button>
          <button
            onClick={() => switchMode(mode === "focus" ? "short" : "focus")}
            className="h-12 w-12 rounded-full border border-border/60 bg-card flex items-center justify-center hover:bg-accent transition"
            aria-label="Switch mode"
          >
            <Coffee className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <TimerIcon className="h-3 w-3" /> Today
          </p>
          <p className="text-2xl font-extrabold text-primary">{formatFocusTime(todayMinutes)}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Pomodoros
          </p>
          <p className="text-2xl font-extrabold text-primary">{pomodoroCount}</p>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Tap the ⏱ icon inside a topic to pop the mini pill anywhere.
      </p>
    </div>
  );
}
