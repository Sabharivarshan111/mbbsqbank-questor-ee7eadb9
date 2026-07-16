import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, ChevronRight, BookOpen, FileText } from "lucide-react";
import { QUESTION_BANK_DATA } from "@/data/questionBankData";
import { collectQuestions, countDone, QUESTION_PROGRESS_EVENT } from "@/lib/question-progress";
import { useProfile } from "@/hooks/use-profile";
import { Accordion } from "@/components/ui/accordion";
import TopicAccordion from "@/components/TopicAccordion";
import SearchBar from "@/components/question-bank/SearchBar";
import NoResultsMessage from "@/components/question-bank/NoResultsMessage";
import SearchResults from "@/components/question-bank/SearchResults";
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

type BrowseMeta = { subject?: string; year?: string; focus?: "search" };

export default function BrowseTab({ meta }: { meta?: BrowseMeta }) {
  const { local } = useProfile();
  const profileYearKey = useMemo(() => {
    const y = local?.year ?? "second";
    return ({ first: "first-year", second: "second-year", third: "third-year", final: "final-year" } as const)[y] ?? "second-year";
  }, [local?.year]);

  const [yearKey, setYearKey] = useState<string>(meta?.year ?? profileYearKey);
  const [subjectKey, setSubjectKey] = useState<string | null>(meta?.subject ?? null);
  const [activeTab, setActiveTab] = useState<"essay" | "short-notes">("essay");
  const [searchQuery, setSearchQuery] = useState("");
  const [tick, setTick] = useState(0);

  // React to Home-triggered navigation meta
  useEffect(() => {
    if (meta?.subject) setSubjectKey(meta.subject);
    if (meta?.year) setYearKey(meta.year);
  }, [meta?.subject, meta?.year]);

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

  // Filtered data for the selected subject (essay OR short-notes only) with search.
  const filteredData = useMemo(() => {
    if (!subjectKey || !yearNode?.subtopics?.[subjectKey]) return {};
    const q = searchQuery.trim().toLowerCase();

    const filterQuestions = (qs: string[]): string[] | null => {
      if (!q) return qs.length ? qs : null;
      const f = qs.filter((x) => x.toLowerCase().includes(q));
      return f.length ? f : null;
    };

    const walk = (content: any): any | null => {
      if (!content || typeof content !== "object") return null;
      if (Array.isArray(content.questions)) {
        const f = filterQuestions(content.questions);
        return f ? { ...content, questions: f } : null;
      }
      if ("essay" in content || "short-notes" in content || "short-note" in content) {
        const out: any = { ...content };
        let kept = false;
        if (activeTab === "essay") {
          if (content.essay) {
            const r = walk(content.essay);
            if (r) { out.essay = r; kept = true; } else { delete out.essay; }
          }
          delete out["short-notes"];
          delete out["short-note"];
        } else {
          const key = "short-notes" in content ? "short-notes" : "short-note" in content ? "short-note" : null;
          if (key && content[key]) {
            const r = walk(content[key]);
            if (r) { out[key] = r; kept = true; } else { delete out[key]; }
          }
          delete out.essay;
        }
        return kept ? out : null;
      }
      if (content.subtopics && typeof content.subtopics === "object") {
        const subs: Record<string, any> = {};
        let kept = false;
        for (const [k, v] of Object.entries(content.subtopics)) {
          if (activeTab === "essay" && (k === "short-notes" || k === "short-note")) continue;
          if (activeTab === "short-notes" && k === "essay") continue;
          const r = walk(v);
          if (r) { subs[k] = r; kept = true; }
        }
        return kept ? { ...content, subtopics: subs } : null;
      }
      return null;
    };

    const subjNode = yearNode.subtopics[subjectKey];
    const walked = walk(subjNode);
    // Wrap the subject as a single "topic" so TopicAccordion renders it consistently.
    if (!walked) return {};
    return { [subjectKey]: walked };
  }, [subjectKey, yearNode, activeTab, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;
  const hasResults = Object.keys(filteredData).length > 0;

  // ---------- SUBJECT DRILL-DOWN VIEW ----------
  if (subjectKey) {
    const subj = subjects.find((s) => s.key === subjectKey);
    return (
      <div className="space-y-4 pb-4">
        {/* Header with back */}
        <header className="pt-2 flex items-center gap-3">
          <button
            onClick={() => { setSubjectKey(null); setSearchQuery(""); }}
            aria-label="Back to subjects"
            className="h-10 w-10 rounded-full border border-border/60 bg-card flex items-center justify-center active:scale-95 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest">{YEAR_LABEL[yearKey]}</p>
            <h1 className="text-xl font-extrabold truncate flex items-center gap-2">
              <span className="text-2xl">{subj?.icon ?? "📘"}</span>
              <span className="bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text text-transparent">
                {subj?.name ?? subjectKey}
              </span>
            </h1>
          </div>
        </header>

        {/* Progress ring bar */}
        {subj && (
          <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-muted-foreground">Subject Progress</p>
                <p className="text-lg font-bold">{subj.done} <span className="text-xs text-muted-foreground">/ {subj.total} questions</span></p>
              </div>
              <div className="text-2xl font-extrabold bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text text-transparent">
                {subj.pct}%
              </div>
            </div>
            <div className="h-2 bg-background/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary via-fuchsia-500 to-purple-500 transition-all"
                style={{ width: `${subj.pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Segmented Essay / Short-notes */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl border border-border/60 bg-card">
          {(["essay", "short-notes"] as const).map((t) => {
            const isActive = activeTab === t;
            const Icon = t === "essay" ? BookOpen : FileText;
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
                {t === "essay" ? "Essay" : "Short Notes"}
              </button>
            );
          })}
        </div>

        <SearchBar searchQuery={searchQuery} handleSearch={(e) => setSearchQuery(e.target.value)} />

        {/* Content */}
        {!hasResults ? (
          isSearching ? (
            <NoResultsMessage searchQuery={searchQuery} />
          ) : (
            <div className="text-center py-10 text-sm text-muted-foreground">
              No {activeTab === "essay" ? "essays" : "short notes"} available for this subject.
            </div>
          )
        ) : isSearching ? (
          <div className="grid gap-3">
            <SearchResults data={filteredData as any} activeTab={activeTab} />
          </div>
        ) : (
          <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur px-1 py-2">
            <Accordion type="multiple" className="w-full text-foreground">
              {Object.entries(filteredData).map(([k, topic]: any) => (
                <TopicAccordion
                  key={k}
                  topicKey={k}
                  topic={topic}
                  isExpanded={false}
                  activeTab={activeTab}
                />
              ))}
            </Accordion>
          </div>
        )}
      </div>
    );
  }

  // ---------- SUBJECT PICKER VIEW ----------
  return (
    <div className="space-y-4 pb-4">
      <header className="pt-2">
        <h1 className="text-2xl font-extrabold">Browse</h1>
        <p className="text-sm text-muted-foreground">Pick a year and a subject to dive in</p>
      </header>

      {/* Year chips */}
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

      {/* Subject grid */}
      {subjects.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No subjects available for {YEAR_LABEL[yearKey]}.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {subjects.map((s) => (
            <button
              key={s.key}
              onClick={() => { setSubjectKey(s.key); setSearchQuery(""); setActiveTab("essay"); }}
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
