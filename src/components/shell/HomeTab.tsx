import { useEffect, useMemo, useState } from "react";
import { TrendingUp, Search, Timer as TimerIcon, Sparkles, Flame, Trophy, ArrowRight, Flag, Menu, ChevronRight, Check, X, BookOpen, FileText } from "lucide-react";
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

// Streak is derived from the profile hook (cloud when signed in, else local).

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
  const { local, cloud, saveProfile } = useProfile();
  const { todayMinutes, lifetimeMinutes } = usePomodoroStats();
  const streak = cloud?.streak ?? 0;
  const [slide, setSlide] = useState(0);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

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
          <div>
            <h1 className="text-lg font-extrabold tracking-tight leading-none">ORBIT</h1>
            <p className="text-[10px] text-muted-foreground">Learn. Retain. Master.</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Hero card */}
      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 p-5">
        <div className="absolute -right-6 -top-6 h-40 w-40 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="relative">
          <p className="text-sm text-muted-foreground">Welcome to</p>
          <h2 className="text-2xl font-extrabold bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text text-transparent">
            {HERO_SLIDES[slide].title}
          </h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
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
        <QuickAction icon={Search} label="Search" sub="Find topics instantly" color="text-cyan-400" onClick={() => setSearchOpen(true)} />
        <QuickAction icon={TimerIcon} label="Timer" sub="Focus with Pomodoro" color="text-emerald-400" onClick={() => onNavigate("timer")} />
        <QuickAction icon={Sparkles} label="Ask AI" sub="Get instant help" color="text-fuchsia-400" onClick={() => onNavigate("askai")} />
      </section>

      {/* Your Subjects */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">Your Subjects</h3>
          <button onClick={() => setYearPickerOpen(true)} className="text-sm text-primary font-medium inline-flex items-center gap-1">
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

      {yearPickerOpen && (
        <YearPickerDialog
          currentYear={local?.year ?? "second"}
          onClose={() => setYearPickerOpen(false)}
          onPick={(y, makeDefault) => {
            if (makeDefault && local) {
              saveProfile({ ...local, year: y }).catch(() => {});
            }
            setYearPickerOpen(false);
            const yk = ({ first: "first-year", second: "second-year", third: "third-year", final: "final-year" } as const)[y];
            onNavigate("browse", { year: yk });
          }}
        />
      )}

      {searchOpen && (
        <QuestionSearchOverlay
          onClose={() => setSearchOpen(false)}
          onPick={(meta) => {
            setSearchOpen(false);
            onNavigate("browse", meta);
          }}
        />
      )}
    </div>
  );
}

type SearchHit = {
  question: string;
  year: string;
  yearLabel: string;
  subject: string;
  subjectName: string;
  paper: string | null;
  topic: string;
  topicName: string;
  type: "essay" | "short-notes";
};

const SEARCH_YEAR_LABEL: Record<string, string> = {
  "first-year": "1st Year",
  "second-year": "2nd Year",
  "third-year": "3rd Year",
  "final-year": "Final Year",
};

function buildSearchIndex(): SearchHit[] {
  const hits: SearchHit[] = [];
  const LEAF = new Set(["essay", "short-note", "short-notes"]);
  const walkTopic = (
    topicKey: string,
    topicNode: any,
    ctx: { year: string; subject: string; subjectName: string; paper: string | null },
  ) => {
    if (!topicNode || typeof topicNode !== "object") return;
    const topicName: string = topicNode.name ?? topicKey;
    // Collect essay + short-notes questions anywhere under this topic.
    const essayQs = collectQuestions(topicNode, "essay");
    const shortQs = collectQuestions(topicNode, "short-notes");
    for (const q of essayQs) {
      hits.push({
        question: q, type: "essay",
        year: ctx.year, yearLabel: SEARCH_YEAR_LABEL[ctx.year] ?? ctx.year,
        subject: ctx.subject, subjectName: ctx.subjectName,
        paper: ctx.paper, topic: topicKey, topicName,
      });
    }
    for (const q of shortQs) {
      hits.push({
        question: q, type: "short-notes",
        year: ctx.year, yearLabel: SEARCH_YEAR_LABEL[ctx.year] ?? ctx.year,
        subject: ctx.subject, subjectName: ctx.subjectName,
        paper: ctx.paper, topic: topicKey, topicName,
      });
    }
  };
  for (const [yearKey, yearNode] of Object.entries((QUESTION_BANK_DATA as any) ?? {})) {
    const subjects = (yearNode as any)?.subtopics ?? {};
    for (const [subKey, subNode] of Object.entries(subjects)) {
      const subjectName = (subNode as any)?.name ?? subKey;
      const subChildren = (subNode as any)?.subtopics ?? {};
      const hasPapers = !!(subChildren["paper-1"] || subChildren["paper-2"]);
      if (hasPapers) {
        for (const [pKey, pNode] of Object.entries(subChildren)) {
          if (pKey !== "paper-1" && pKey !== "paper-2") continue;
          const topics = (pNode as any)?.subtopics ?? {};
          for (const [tKey, tNode] of Object.entries(topics)) {
            if (LEAF.has(tKey)) continue;
            walkTopic(tKey, tNode, { year: yearKey, subject: subKey, subjectName, paper: pKey });
          }
        }
      } else {
        for (const [tKey, tNode] of Object.entries(subChildren)) {
          if (LEAF.has(tKey)) continue;
          walkTopic(tKey, tNode, { year: yearKey, subject: subKey, subjectName, paper: null });
        }
      }
    }
  }
  return hits;
}

function QuestionSearchOverlay({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (meta: { year: string; subject: string; paper?: string; topic: string; tab: "essay" | "short-notes" }) => void;
}) {
  const [q, setQ] = useState("");
  const index = useMemo(() => buildSearchIndex(), []);
  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (query.length < 2) return [] as SearchHit[];
    const words = query.split(/\s+/).filter(Boolean);
    const scored = index
      .map((h) => {
        const hay = `${h.question} ${h.topicName} ${h.subjectName}`.toLowerCase();
        const ok = words.every((w) => hay.includes(w));
        if (!ok) return null;
        // Rank: prefix on question wins
        let score = 0;
        if (h.question.toLowerCase().startsWith(query)) score += 100;
        if (h.topicName.toLowerCase().includes(query)) score += 20;
        if (h.subjectName.toLowerCase().includes(query)) score += 10;
        return { h, score };
      })
      .filter(Boolean) as { h: SearchHit; score: number }[];
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 60).map((s) => s.h);
  }, [q, index]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-2xl h-full flex flex-col p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={onClose}
            aria-label="Close search"
            className="h-10 w-10 rounded-full bg-card border border-border/60 flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search questions here"
              className="w-full pl-10 pr-3 py-3 rounded-full bg-card border border-border/60 text-sm focus:outline-none focus:border-primary/60"
            />
          </div>
        </div>
        <div className="flex-1 mt-4 overflow-y-auto space-y-2 pb-6">
          {q.trim().length < 2 && (
            <div className="text-center text-sm text-muted-foreground mt-10">
              Type at least 2 letters — a question, chapter, or subject.
            </div>
          )}
          {q.trim().length >= 2 && results.length === 0 && (
            <div className="text-center text-sm text-muted-foreground mt-10">
              No matches found.
            </div>
          )}
          {results.map((h, i) => {
            const Icon = h.type === "essay" ? BookOpen : FileText;
            return (
              <button
                key={i}
                onClick={() =>
                  onPick({
                    year: h.year,
                    subject: h.subject,
                    paper: h.paper ?? undefined,
                    topic: h.topic,
                    tab: h.type,
                  })
                }
                className="w-full text-left rounded-xl border border-border/60 bg-card hover:border-primary/50 p-3 transition"
              >
                <p className="text-sm font-medium line-clamp-2">{h.question}</p>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1 text-primary">
                    <Icon className="h-3 w-3" />
                    {h.type === "essay" ? "Essay" : "Short Note"}
                  </span>
                  <span>·</span>
                  <span className="truncate">{h.yearLabel} → {h.subjectName}{h.paper ? ` → ${h.paper === "paper-1" ? "Paper 1" : "Paper 2"}` : ""} → {h.topicName}</span>
                </div>
                <div className="mt-2 text-[11px] text-primary font-semibold inline-flex items-center gap-1">
                  Switch to this chapter <ChevronRight className="h-3 w-3" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function YearPickerDialog({
  currentYear,
  onClose,
  onPick,
}: {
  currentYear: Year;
  onClose: () => void;
  onPick: (y: Year, makeDefault: boolean) => void;
}) {
  const [pick, setPick] = useState<Year>(currentYear);
  const [makeDefault, setMakeDefault] = useState(false);
  const YEARS: { key: Year; label: string }[] = [
    { key: "first", label: "1st Year" },
    { key: "second", label: "2nd Year" },
    { key: "third", label: "3rd Year" },
    { key: "final", label: "Final Year" },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Select Year</h3>
            <p className="text-xs text-muted-foreground">Choose the year you want to browse</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {YEARS.map((y) => {
            const active = pick === y.key;
            const isDefault = currentYear === y.key;
            return (
              <button
                key={y.key}
                onClick={() => setPick(y.key)}
                className={`rounded-xl border p-3 text-left transition ${active ? "border-primary bg-primary/10" : "border-border/60 bg-background/40 hover:border-primary/40"}`}
              >
                <p className="font-semibold text-sm">{y.label}</p>
                {isDefault && <p className="text-[10px] text-primary mt-0.5">Current default</p>}
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <span className={`h-5 w-5 rounded-md border flex items-center justify-center ${makeDefault ? "bg-primary border-primary" : "border-border"}`}>
            {makeDefault && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
          </span>
          <input type="checkbox" className="sr-only" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} />
          Set as my default year
        </label>
        <button
          onClick={() => onPick(pick, makeDefault)}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-fuchsia-500 text-primary-foreground font-semibold"
        >
          Browse {YEARS.find((y) => y.key === pick)?.label}
        </button>
      </div>
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
