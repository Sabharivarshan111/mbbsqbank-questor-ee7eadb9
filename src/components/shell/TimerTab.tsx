import { useEffect, useState } from "react";
import { Play, Pause, RotateCcw, Settings2, Coffee, Timer as TimerIcon, Sparkles, Users, Pencil, Check } from "lucide-react";
import { usePomodoroCtx } from "@/hooks/pomodoro-context";
import { formatFocusTime } from "@/hooks/use-pomodoro-stats";
import { useOnlinePresence } from "@/hooks/use-online-presence";
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
    lifetimeMinutes,
    toggleTimer,
    resetTimer,
    switchMode,
    setCustomMinutes,
  } = usePomodoroCtx();
  const { onlineCount } = useOnlinePresence();

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("orbit:hide-pomodoro"));
  }, []);

  const meta = MODE_META[mode];
  const size = 280;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * (1 - progressPercentage / 100);

  // Tap-to-edit custom minutes
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const openEdit = () => {
    if (isRunning) return;
    setDraft(String(minutes));
    setEditing(true);
  };
  const commitEdit = () => {
    const n = parseInt(draft, 10);
    if (!isNaN(n)) setCustomMinutes(n);
    setEditing(false);
  };

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

      {/* Big timer ring — perfectly round, no square container */}
      <div className="flex flex-col items-center py-4 select-none">
        <div
          className="relative rounded-full"
          style={{
            width: size,
            height: size,
            boxShadow: "0 0 60px hsl(var(--primary) / 0.18)",
          }}
        >
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="-rotate-90 block"
            style={{ overflow: "visible" }}
          >
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
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              {meta.emoji} {meta.label}
            </span>

            {editing ? (
              <form
                onSubmit={(e) => { e.preventDefault(); commitEdit(); }}
                className="mt-1 flex items-center gap-2"
              >
                <input
                  autoFocus
                  inputMode="numeric"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 2))}
                  onBlur={commitEdit}
                  className="w-24 bg-transparent border-b-2 border-primary text-center font-mono text-5xl font-extrabold tabular-nums text-foreground focus:outline-none"
                />
                <button type="submit" aria-label="Save" className="text-primary">
                  <Check className="h-5 w-5" />
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={openEdit}
                disabled={isRunning}
                className="mt-1 font-mono text-5xl font-extrabold tabular-nums text-foreground disabled:cursor-default group"
                aria-label="Tap to set custom minutes"
              >
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                {!isRunning && (
                  <Pencil className="inline-block h-3 w-3 ml-2 text-muted-foreground opacity-60 group-hover:opacity-100" />
                )}
              </button>
            )}

            <span className="mt-1 text-[11px] text-muted-foreground">
              {isRunning
                ? `🍅 ${pomodoroCount % settings.longEvery}/${settings.longEvery} to long break`
                : "Tap the number to set custom time"}
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

      {/* People studying with you */}
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-fuchsia-500/10 to-primary/10 p-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
          <Users className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Studying with you right now</p>
          <p className="font-bold text-primary text-sm">
            {onlineCount == null ? "—" : `${onlineCount.toLocaleString()} ${onlineCount === 1 ? "person" : "people"} online`}
          </p>
        </div>
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <TimerIcon className="h-3 w-3" /> Today
          </p>
          <p className="text-2xl font-extrabold text-primary">{formatFocusTime(todayMinutes)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Total: {formatFocusTime(lifetimeMinutes)}</p>
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
