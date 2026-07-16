import { useEffect, useMemo, useState } from "react";
import { TrendingUp, Search, Timer as TimerIcon, Sparkles, Flame, Trophy, ArrowRight, Flag, Menu, ChevronRight, Check, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import type { Year } from "@/lib/year-subjects";
import { QUESTION_BANK_DATA } from "@/data/questionBankData";
import { collectQuestions, countDone, QUESTION_PROGRESS_EVENT } from "@/lib/question-progress";
import { usePomodoroStats, formatFocusTime } from "@/hooks/use-pomodoro-stats";
import { useProfile } from "@/hooks/use-profile";
import type { ShellTab } from "./BottomNav";

const SUBJECT_ICONS: Record<string, string> = {
  anatomy: "🫀",
  physiology: "🧠",
  biochemistry: "🧬",
  pharmacology: "💊",
  pathology: "🔬",
  microbiology: "🦠",
  "forensic-medicine": "⚖️",
  "community-medicine": "🏥",
  "general-medicine": "🩺",
  "general-surgery": "🔪",
  "obstetrics-gynaecology": "👶",
  "paediatrics": "🧒",
  "ent": "👂",
  ophthalmology: "👁️",
};

const SUBJECT_GRADIENTS: Record<string, string> = {
  anatomy: "from-purple-600/40 to-indigo-900/60",
  physiology: "from-fuchsia-600/40 to-purple-900/60",
  biochemistry: "from-cyan-600/40 to-blue-900/60",
  pharmacology: "from-teal-600/40 to-cyan-900/60",
  pathology: "from-violet-600/40 to-purple-900/60",
  microbiology: "from-emerald-600/40 to-green-900/60",
};

function useStreak(): number {
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("orbit:streak");
      if (raw) setStreak(parseInt(raw, 10) || 0);
    } catch {}
    const h = () => {
      try {
        const raw = localStorage.getItem("orbit:streak");
        setStreak(raw ? parseInt(raw, 10) || 0 : 0);
      } catch {}
    };
    window.addEventListener(QUESTION_PROGRESS_EVENT, h);
    return () => window.removeEventListener(QUESTION_PROGRESS_EVENT, h);
  }, []);
  return streak;
}

const HERO_SLIDES = [
  {
    title: "Welcome to Orbit!",
    body: "Every great journey begins with a single step. Stay consistent, stay curious, and you'll achieve greatness.",
  },
  {
    title: "AI-Powered Learning",
    body: "Triple-tap any question to instantly ask AI. Double-tap to generate MCQs from any topic.",
  },
  {
    title: "Track Your Journey",
    body: "Handwritten notes, spaced revision, and progress rings — everything you need in one orbit.",
  },
];

export default function HomeTab({ onNavigate }: { onNavigate: (tab: ShellTab, meta?: any) => void }) {
  const { local, saveProfile } = useProfile();
  const { todayMinutes } = usePomodoroStats();
  const streak = useStreak();
  const [slide, setSlide] = useState(0);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), 6000);
    return () => clearInterval(id);
  }, []);

  const yearKey = useMemo(() => {
    const y = local?.year ?? "second";
    return ({ first: "first-year", second: "second-year", third: "third-year", final: "final-year" } as const)[y] ?? "second-year";
  }, [local?.year]);

  const subjects = useMemo(() => {
    const node = (QUESTION_BANK_DATA as any)[yearKey];
    if (!node?.subtopics) return [];
    return Object.entries(node.subtopics).map(([key, sub]: any) => {
      const essay = collectQuestions(sub, "essay");
      const shorts = collectQuestions(sub, "short-notes");
      const all = Array.from(new Set([...essay, ...shorts]));
      const done = countDone(all);
      const pct = all.length ? Math.round((done / all.length) * 100) : 0;
      return {
        key,
        name: (sub.name as string) ?? key,
        icon: SUBJECT_ICONS[key] ?? "📘",
        gradient: SUBJECT_GRADIENTS[key] ?? "from-violet-600/40 to-purple-900/60",
        pct,
      };
    });
  }, [yearKey]);

  const totalStudyMinutes = todayMinutes;
  const focusStr = formatFocusTime(totalStudyMinutes);

  return (
    <div className="space-y-5 pb-4">
      {/* Header */}
      <header className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <button aria-label="Menu" className="h-9 w-9 rounded-md flex items-center justify-center hover:bg-muted transition">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="relative h-9 w-9">
              <div className="absolute inset-0 rounded-full border-2 border-primary/70" />
              <div className="absolute inset-1 rounded-full bg-gradient-to-br from-primary/40 to-primary/10" />
              <div className="absolute -right-0 top-1 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight leading-none">ORBIT</h1>
              <p className="text-[10px] text-muted-foreground">Learn. Retain. Master.</p>
            </div>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Hero card */}
      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 p-5">
        <div className="absolute -right-6 -top-6 h-40 w-40 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute -right-2 top-2 opacity-90 pointer-events-none">
          <div className="text-6xl">🧠</div>
        </div>
        <div className="relative">
          <div className="flex items-start gap-3">
            <div className="text-3xl">⚗️</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">Welcome to</p>
              <h2 className="text-2xl font-extrabold bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text text-transparent">
                {HERO_SLIDES[slide].title}
              </h2>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-[85%]">
            {HERO_SLIDES[slide].body}
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Created by
              <div className="text-xs font-semibold text-foreground normal-case tracking-normal">Sabharivarshan S</div>
            </div>
            <Flag className="h-4 w-4 text-muted-foreground ml-2" />
          </div>
          <div className="mt-3 flex gap-1.5">
            {HERO_SLIDES.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === slide ? "w-5 bg-primary" : "w-1.5 bg-muted"}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="grid grid-cols-4 gap-2">
        <QuickAction icon={TrendingUp} label="Progress" sub="Track your learning" color="text-primary" onClick={() => onNavigate("progress")} />
        <QuickAction icon={Search} label="Search" sub="Find topics instantly" color="text-cyan-400" onClick={() => onNavigate("browse", { focus: "search" })} />
        <QuickAction icon={TimerIcon} label="Timer" sub="Focus with Pomodoro" color="text-emerald-400" onClick={() => onNavigate("timer")} />
        <QuickAction icon={Sparkles} label="Ask AI" sub="Get instant help" color="text-fuchsia-400" onClick={() => onNavigate("askai")} />
      </section>

      {/* Your Subjects */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">Your Subjects</h3>
          <button onClick={() => onNavigate("browse")} className="text-sm text-primary font-medium inline-flex items-center gap-1">
            View all <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {subjects.map((s) => (
            <button
              key={s.key}
              onClick={() => onNavigate("browse", { subject: s.key })}
              className={`relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br ${s.gradient} p-4 text-left h-40 flex flex-col justify-end group active:scale-[0.98] transition`}
            >
              <div className="absolute top-3 right-3 text-4xl opacity-80 group-hover:scale-110 transition-transform">{s.icon}</div>
              <div className="relative">
                <p className="font-bold uppercase text-sm text-foreground/95">{s.name}</p>
                <div className="mt-2 h-1 bg-background/40 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${s.pct}%` }} />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[11px] text-primary font-medium">{s.pct}% Complete</span>
                  <span className="h-6 w-6 rounded-full bg-background/40 flex items-center justify-center">
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="grid grid-cols-2 divide-x divide-border/60">
          <div className="flex items-center gap-3 pr-4">
            <div className="h-11 w-11 rounded-full bg-primary/15 flex items-center justify-center">
              <Flame className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Study Streak</p>
              <p className="font-bold">
                <span className="text-lg">{streak}</span> <span className="text-xs text-muted-foreground">days 🔥</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 pl-4">
            <div className="h-11 w-11 rounded-full bg-primary/15 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Study Time</p>
              <p className="font-bold text-sm">{focusStr}</p>
              <p className="text-[10px] text-primary">Keep going!</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  sub,
  color,
  onClick,
}: {
  icon: any;
  label: string;
  sub: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-border/60 bg-card p-3 text-left flex flex-col justify-between h-[120px] active:scale-[0.97] transition hover:border-primary/40"
    >
      <Icon className={`h-5 w-5 ${color}`} />
      <div>
        <p className={`text-sm font-bold ${color}`}>{label}</p>
        <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{sub}</p>
        <ArrowRight className={`h-3 w-3 ${color} mt-1`} />
      </div>
    </button>
  );
}
