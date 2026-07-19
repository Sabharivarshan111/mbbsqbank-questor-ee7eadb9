import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, BookOpen, FileText, Timer as TimerIcon, Search } from "lucide-react";
import { QUESTION_BANK_DATA } from "@/data/questionBankData";
import { collectQuestions, countDone, QUESTION_PROGRESS_EVENT } from "@/lib/question-progress";
import { useProfile } from "@/hooks/use-profile";
import QuestionCard from "@/components/QuestionCard";
import { showRewardedAd } from "@/services/AndroidAds";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const SUBJECT_ICONS: Record<string, string> = {
  anatomy: "🫀", physiology: "🧠", biochemistry: "🧬",
  pharmacology: "💊", pathology: "🔬", microbiology: "🦠",
  "forensic-medicine": "⚖️", "community-medicine": "🏥",
  "general-medicine": "🩺", "general-surgery": "🔪",
  "obstetrics-gynaecology": "👶", paediatrics: "🧒",
  ent: "👂", ophthalmology: "👁️",
};

const SUBJECT_GRADIENTS: Record<string, string> = {
  anatomy: "from-purple-600/40 to-indigo-900/70",
  physiology: "from-fuchsia-600/40 to-purple-900/70",
  biochemistry: "from-cyan-600/40 to-blue-900/70",
  pharmacology: "from-teal-600/40 to-cyan-900/70",
  pathology: "from-violet-600/40 to-purple-900/70",
  microbiology: "from-emerald-600/40 to-green-900/70",
  "forensic-medicine": "from-rose-600/40 to-red-900/70",
  "community-medicine": "from-amber-600/40 to-orange-900/70",
  "general-medicine": "from-sky-600/40 to-indigo-900/70",
  "general-surgery": "from-red-600/40 to-rose-900/70",
  "obstetrics-gynaecology": "from-pink-600/40 to-fuchsia-900/70",
  paediatrics: "from-yellow-600/40 to-amber-900/70",
  ent: "from-lime-600/40 to-emerald-900/70",
  ophthalmology: "from-blue-600/40 to-indigo-900/70",
};

const YEAR_KEYS = ["first-year", "second-year", "third-year", "final-year"] as const;
const YEAR_LABEL: Record<string, string> = {
  "first-year": "1st Year",
  "second-year": "2nd Year",
  "third-year": "3rd Year",
  "final-year": "Final Year",
};

type BrowseMeta = { subject?: string; year?: string; paper?: string; topic?: string; tab?: "essay" | "short-notes"; focus?: "search" };

/** Locate essay/short-notes question arrays under a node (topic or paper node) */
function findTypeQuestions(node: any, type: "essay" | "short-notes"): string[] {
  if (!node) return [];
  const shortKeys = ["short-notes", "short-note"];
  const container = node.subtopics ?? node;
  if (type === "essay") {
    const e = container?.essay;
    if (e?.questions) return e.questions as string[];
  } else {
    for (const k of shortKeys) {
      const s = container?.[k];
      if (s?.questions) return s.questions as string[];
    }
  }
  return [];
}

/** True if a subtopic key is a leaf question-type container */
const LEAF_KEYS = new Set(["essay", "short-notes", "short-note"]);

/** Return real topic children of a node, excluding leaf question-type keys */
function getTopicChildren(node: any): Array<{ key: string; name: string; node: any }> {
  const subs = node?.subtopics ?? {};
  return Object.entries(subs)
    .filter(([k]) => !LEAF_KEYS.has(k))
    .map(([k, v]: any) => ({ key: k, name: v.name ?? k, node: v }));
}

export default function BrowseTab({ meta }: { meta?: BrowseMeta }) {
  const { local } = useProfile();
  const profileYearKey = useMemo(() => {
    const y = local?.year ?? "second";
    return ({ first: "first-year", second: "second-year", third: "third-year", final: "final-year" } as const)[y] ?? "second-year";
  }, [local?.year]);

  const [yearKey, setYearKey] = useState<string>(meta?.year ?? profileYearKey);
  const [subjectKey, setSubjectKey] = useState<string | null>(meta?.subject ?? null);
  const [paperKey, setPaperKey] = useState<string | null>(null);
  const [topicKey, setTopicKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"essay" | "short-notes">("essay");
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState("");

  // Once-per-day rewarded ad when opening Short Notes tab.
  const SN_AD_KEY = "orbit:ad:shortNotesShownDate";
  const shortNotesAdFiredRef = useRef(false);
  const triggerShortNotesAd = useCallback(() => {
    if (typeof window === "undefined") return;
    if (shortNotesAdFiredRef.current) return;
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(SN_AD_KEY) === today) return;
    shortNotesAdFiredRef.current = true;
    localStorage.setItem(SN_AD_KEY, today);
    toast({
      title: "Sponsored",
      description: "A short ad plays once per day on Short Notes to keep Orbit free. Sorry for the inconvenience!",
    });
    void showRewardedAd("short-notes").then((r) => {
      console.log(`[ShortNotes] Ad: ${r.completed ? "completed" : r.reason ?? "unknown"}`);
    });
  }, []);

  const handleTabChange = useCallback((t: "essay" | "short-notes") => {
    setActiveTab(t);
    if (t === "short-notes") triggerShortNotesAd();
  }, [triggerShortNotesAd]);

  // React to Home navigation meta
  useEffect(() => {
    if (meta?.subject) { setSubjectKey(meta.subject); setPaperKey(meta.paper ?? null); setTopicKey(meta.topic ?? null); }
    if (meta?.year) setYearKey(meta.year);
    if (meta?.tab) setActiveTab(meta.tab);
  }, [meta?.subject, meta?.year, meta?.paper, meta?.topic, meta?.tab]);

  useEffect(() => {
    const h = () => setTick((t) => t + 1);
    window.addEventListener(QUESTION_PROGRESS_EVENT, h);
    return () => window.removeEventListener(QUESTION_PROGRESS_EVENT, h);
  }, []);

  const yearNode = (QUESTION_BANK_DATA as any)[yearKey];
  const subjects = useMemo(() => {
    if (!yearNode?.subtopics) return [];
    return Object.entries(yearNode.subtopics).map(([key, sub]: any) => {
      const essay = collectQuestions(sub, "essay");
      const shorts = collectQuestions(sub, "short-notes");
      const all = Array.from(new Set([...essay, ...shorts]));
      const done = countDone(all);
      return {
        key,
        name: (sub.name as string) ?? key,
        icon: SUBJECT_ICONS[key] ?? "📘",
        gradient: SUBJECT_GRADIENTS[key] ?? "from-violet-600/40 to-purple-900/70",
        total: all.length,
        done,
        pct: all.length ? Math.round((done / all.length) * 100) : 0,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearNode, tick]);

  const subjectNode = subjectKey ? yearNode?.subtopics?.[subjectKey] : null;
  const subjectHasPapers = !!(subjectNode?.subtopics?.["paper-1"] || subjectNode?.subtopics?.["paper-2"]);

  // ---------- Level: TOPIC DETAIL (essay / short-notes questions) ----------
  if (subjectKey && topicKey) {
    const parent = paperKey ? subjectNode?.subtopics?.[paperKey] : subjectNode;
    const topicNode = parent?.subtopics?.[topicKey];
    const topicName = topicNode?.name ?? topicKey;
    const essayQs = findTypeQuestions(topicNode, "essay");
    const shortQs = findTypeQuestions(topicNode, "short-notes");
    const questions = activeTab === "essay" ? essayQs : shortQs;
    const q = search.trim().toLowerCase();
    const filtered = q ? questions.filter((x) => x.toLowerCase().includes(q)) : questions;

    return (
      <div className="space-y-4 pb-4">
        <header className="pt-2 flex items-center justify-between gap-3">
          <button
            onClick={() => setTopicKey(null)}
            aria-label="Back"
            className="h-10 w-10 rounded-full border border-border/60 bg-card flex items-center justify-center active:scale-95 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="text-center flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-primary">Topic</p>
            <h1 className="text-lg font-extrabold truncate">{topicName}</h1>
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("orbit:show-pomodoro"))}
            aria-label="Show Pomodoro timer"
            className="h-10 w-10 rounded-full border border-border/60 bg-card flex items-center justify-center text-primary hover:border-primary/60 active:scale-95 transition"
          >
            <TimerIcon className="h-4 w-4" />
          </button>
        </header>

        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl border border-border/60 bg-card">
          {(["essay", "short-notes"] as const).map((t) => {
            const isActive = activeTab === t;
            const Icon = t === "essay" ? BookOpen : FileText;
            const count = t === "essay" ? essayQs.length : shortQs.length;
            return (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={cn(
                  "py-2.5 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all",
                  isActive
                    ? "bg-gradient-to-r from-primary to-fuchsia-500 text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {t === "essay" ? "Essays" : "Short Notes"}
                <span className="ml-1 text-[10px] opacity-80">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-card border border-border/60 text-sm focus:outline-none focus:border-primary/60"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            No {activeTab === "essay" ? "essays" : "short notes"} available.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((question, i) => (
              <QuestionCard
                key={`${question.slice(0, 40)}-${i}`}
                question={question}
                index={i}
                isFirstYear={yearKey === "first-year"}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---------- Level: PAPER → TOPIC LIST ----------
  if (subjectKey && (paperKey || !subjectHasPapers)) {
    const parent = paperKey ? subjectNode?.subtopics?.[paperKey] : subjectNode;
    const topics = getTopicChildren(parent);
    const subj = subjects.find((s) => s.key === subjectKey);
    const parentName = paperKey ? (parent?.name ?? paperKey) : subj?.name ?? subjectKey;

    return (
      <div className="space-y-4 pb-4">
        <header className="pt-2 flex items-center gap-3">
          <button
            onClick={() => (paperKey ? setPaperKey(null) : setSubjectKey(null))}
            aria-label="Back"
            className="h-10 w-10 rounded-full border border-border/60 bg-card flex items-center justify-center active:scale-95 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-[10px] uppercase tracking-widest text-primary">
              {topics.length} Topics
            </p>
            <h1 className="text-xl font-extrabold truncate bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text text-transparent">
              {parentName}
            </h1>
          </div>
          <div className="h-10 w-10" />
        </header>

        {topics.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No topics available.
          </div>
        ) : (
          <div className="space-y-3">
            {topics.map((t, i) => {
              const all = Array.from(
                new Set([...collectQuestions(t.node, "essay"), ...collectQuestions(t.node, "short-notes")])
              );
              const done = countDone(all);
              const pct = all.length ? Math.round((done / all.length) * 100) : 0;
              return (
                <button
                  key={t.key}
                  onClick={() => { setTopicKey(t.key); setActiveTab("essay"); setSearch(""); }}
                  className="w-full text-left rounded-2xl border border-border/60 bg-card hover:border-primary/40 p-4 flex items-center gap-4 active:scale-[0.99] transition"
                >
                  <div className="h-14 w-14 rounded-xl border border-primary/40 bg-primary/10 flex items-center justify-center text-primary font-extrabold text-xl">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{t.name}</p>
                    <div className="mt-2 h-1 bg-background/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-fuchsia-400 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{done}/{all.length} questions</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ---------- Level: SUBJECT → PAPER PICKER ----------
  if (subjectKey && subjectHasPapers) {
    const subj = subjects.find((s) => s.key === subjectKey);
    const papers = Object.entries(subjectNode!.subtopics)
      .filter(([k]) => k === "paper-1" || k === "paper-2")
      .map(([k, v]: any) => ({ key: k, node: v, name: v.name ?? k }));
    return (
      <div className="space-y-5 pb-4">
        <header className="pt-2 flex items-center gap-3">
          <button
            onClick={() => setSubjectKey(null)}
            aria-label="Back"
            className="h-10 w-10 rounded-full border border-border/60 bg-card flex items-center justify-center active:scale-95 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <div className="mx-auto h-14 w-14 rounded-full border border-primary/40 bg-primary/10 flex items-center justify-center text-2xl">
              {subj?.icon ?? "📘"}
            </div>
            <p className="mt-2 text-xl font-extrabold tracking-widest bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text text-transparent uppercase">
              {subj?.name ?? subjectKey}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Select examination paper</p>
          </div>
          <div className="h-10 w-10" />
        </header>

        <div className="space-y-4">
          {papers.map((p, i) => {
            const topicsList = getTopicChildren(p.node);
            const topicPreview = topicsList.map((t) => t.name).slice(0, 12).join(" • ");
            return (
              <div key={p.key} className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                <button
                  onClick={() => setPaperKey(p.key)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-primary/5 transition text-left"
                >
                  <div className="h-14 w-14 rounded-xl border border-primary/40 bg-primary/10 flex items-center justify-center text-primary font-extrabold">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold">{p.name}</p>
                    <div className="h-0.5 w-8 bg-primary rounded-full mt-1" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
                {topicPreview && (
                  <div className="px-4 pb-3 text-xs text-muted-foreground leading-relaxed">
                    {topicPreview}
                  </div>
                )}
                <button
                  onClick={() => setPaperKey(p.key)}
                  className="w-full flex items-center justify-between px-4 py-3 border-t border-border/60 text-primary text-sm font-semibold hover:bg-primary/5 transition"
                >
                  <span className="inline-flex items-center gap-2"><Search className="h-4 w-4" /> Explore Questions</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------- Level: SUBJECT PICKER ----------
  return (
    <div className="space-y-4 pb-4">
      <header className="pt-2">
        <h1 className="text-2xl font-extrabold">Browse</h1>
        <p className="text-sm text-muted-foreground">Pick a year and a subject to dive in</p>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {YEAR_KEYS.map((yk) => {
          const active = yk === yearKey;
          return (
            <button
              key={yk}
              onClick={() => setYearKey(yk)}
              className={cn(
                "flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-all",
                active
                  ? "bg-gradient-to-r from-primary to-fuchsia-500 text-primary-foreground border-transparent shadow-md shadow-primary/30"
                  : "bg-card text-muted-foreground border-border/60 hover:text-foreground hover:border-primary/40"
              )}
            >
              {YEAR_LABEL[yk]}
            </button>
          );
        })}
      </div>

      {subjects.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No subjects available for {YEAR_LABEL[yearKey]}.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {subjects.map((s) => (
            <button
              key={s.key}
              onClick={() => { setSubjectKey(s.key); setPaperKey(null); setTopicKey(null); }}
              className={cn(
                "relative overflow-hidden rounded-2xl border border-border/60 p-4 text-left h-44 flex flex-col justify-end group active:scale-[0.98] transition",
                "bg-gradient-to-br", s.gradient
              )}
            >
              <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-primary/20 blur-2xl pointer-events-none" />
              <div className="absolute top-3 right-3 text-4xl opacity-90 group-hover:scale-110 transition-transform">
                {s.icon}
              </div>
              <div className="relative">
                <p className="font-bold uppercase text-sm text-foreground/95 leading-tight">{s.name}</p>
                <p className="text-[10px] text-foreground/70 mt-0.5">{s.total} questions</p>
                <div className="mt-2 h-1 bg-background/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-fuchsia-400 rounded-full"
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[11px] text-primary font-semibold">{s.pct}% Complete</span>
                  <span className="h-6 w-6 rounded-full bg-background/40 flex items-center justify-center">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
