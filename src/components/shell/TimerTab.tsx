import { useEffect, useRef, useState } from "react";
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

const MAX_MIN = 90; // full ring = 90 minutes when in edit mode

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

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("orbit:hide-pomodoro"));
  }, []);

  const meta = MODE_META[mode];
  const size = 280;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const [dragMin, setDragMin] = useState<number | null>(null);
  const draggingRef = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const displayMin = dragMin ?? minutes;
  const displaySec = dragMin != null ? 0 : seconds;
  const editing = dragMin != null;
  const editPct = editing ? Math.min(100, (displayMin / MAX_MIN) * 100) : progressPercentage;
  const dash = circumference * (1 - editPct / 100);

  const handleToggle = () => {
    primeAudio();
    toggleTimer();
  };

  const angleToMinutes = (clientX: number, clientY: number): number | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    // angle from 12 o'clock, clockwise, 0..2π
    let a = Math.atan2(dx, -dy);
    if (a < 0) a += Math.PI * 2;
    const frac = a / (Math.PI * 2);
    return Math.max(1, Math.min(MAX_MIN, Math.round(frac * MAX_MIN)));
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isRunning) return;
    draggingRef.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const m = angleToMinutes(e.clientX, e.clientY);
    if (m != null) setDragMin(m);
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingRef.current) return;
    const m = angleToMinutes(e.clientX, e.clientY);
    if (m != null) setDragMin(m);
  };
  const onPointerUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (dragMin != null) {
      setCustomMinutes(dragMin);
    }
    setDragMin(null);
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

      {/* Big timer ring (no square container) */}
      <div className="flex flex-col items-center py-4 select-none">
        <div className="relative" style={{ width: size, height: size }}>
          <svg
            ref={svgRef}
            width={size}
            height={size}
            className="-rotate-90 touch-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
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
              className="stroke-primary fill-none transition-all duration-300"
              style={{ filter: "drop-shadow(0 0 12px hsl(var(--primary)/0.55))" }}
            />
            {/* Draggable handle */}
            {!isRunning && (() => {
              const angle = (editPct / 100) * Math.PI * 2 - Math.PI / 2;
              const hx = size / 2 + radius * Math.cos(angle);
              const hy = size / 2 + radius * Math.sin(angle);
              return (
                <circle
                  cx={hx}
                  cy={hy}
                  r={10}
                  className="fill-primary"
                  style={{ filter: "drop-shadow(0 0 6px hsl(var(--primary)/0.7))" }}
                />
              );
            })()}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              {meta.emoji} {editing ? "Set duration" : meta.label}
            </span>
            <span className="mt-1 font-mono text-5xl font-extrabold tabular-nums text-foreground">
              {String(displayMin).padStart(2, "0")}:{String(displaySec).padStart(2, "0")}
            </span>
            <span className="mt-1 text-[11px] text-muted-foreground">
              {isRunning
                ? `🍅 ${pomodoroCount % settings.longEvery}/${settings.longEvery} to long break`
                : "Drag the ring to set time"}
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
