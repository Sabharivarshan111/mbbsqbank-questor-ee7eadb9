import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, FileText, Search, RefreshCw, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import QuestionCard from "@/components/QuestionCard";
import { QUESTION_PROGRESS_EVENT } from "@/lib/question-progress";
import { requestDailyAd } from "@/lib/daily-ad";
import GoogleGateCard from "@/components/GoogleGateCard";
import { pushBackHandler } from "@/lib/back-stack";

type MuhsYear = "first-year" | "second-year" | "third-year";
type QType = "essay" | "short-notes";
type MuhsRow = {
  id: string;
  study_year: MuhsYear;
  subject: string;
  chapter: string;
  question_type: QType;
  question_text: string;
  source_page: number;
  source_column: number;
  source_pdf: string;
};

const PAGE_SIZE = 500;
const YEAR_LABELS: Record<MuhsYear, string> = {
  "first-year": "1st Year",
  "second-year": "2nd Year",
  "third-year": "3rd Year",
};
const SUBJECTS: Record<MuhsYear, { name: string; key: string; icon: string }[]> = {
  "first-year": [
    { name: "Anatomy", key: "anatomy", icon: "🫀" },
    { name: "Physiology", key: "physiology", icon: "🧠" },
    { name: "Biochemistry", key: "biochemistry", icon: "🧬" },
  ],
  "second-year": [
    { name: "Pharmacology", key: "pharmacology", icon: "💊" },
    { name: "Pathology", key: "pathology", icon: "🔬" },
    { name: "Microbiology", key: "microbiology", icon: "🦠" },
  ],
  "third-year": [
    { name: "Community Medicine (PSM)", key: "community-medicine", icon: "🏥" },
    { name: "Forensic Medicine", key: "forensic-medicine", icon: "⚖️" },
  ],
};
const YEAR_OPTIONS: MuhsYear[] = ["first-year", "second-year", "third-year"];
const BROWSE_CLASS = "rounded-xl border border-border/60 bg-card p-4 text-left flex items-center gap-3 w-full active:scale-[0.99] transition hover:border-primary/50";
const sorted = (a: MuhsRow, b: MuhsRow) => a.source_page - b.source_page || a.source_column - b.source_column || a.id.localeCompare(b.id);

export default function MuhsEarlyYearsBrowser({ onBack }: { onBack: () => void }) {
  const [year, setYear] = useState<MuhsYear>("first-year");
  const [subject, setSubject] = useState<string | null>(null);
  const [chapter, setChapter] = useState<string | null>(null);
  const [type, setType] = useState<QType>("essay");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<MuhsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [progressTick, setProgressTick] = useState(0);

  useEffect(() => {
    const handler = () => setProgressTick((v) => v + 1);
    window.addEventListener(QUESTION_PROGRESS_EVENT, handler);
    return () => window.removeEventListener(QUESTION_PROGRESS_EVENT, handler);
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setRows([]);
    const load = async () => {
      const all: MuhsRow[] = [];
      try {
        // Supabase/PostgREST caps one response at 1,000 rows. Fetch every page,
        // or students would silently miss later chapters and questions.
        for (let start = 0; start < 15000; start += PAGE_SIZE) {
          const { data, error: fetchError } = await (supabase as any)
            .from("muhs_early_year_questions")
            .select("id,study_year,subject,chapter,question_type,question_text,source_page,source_column,source_pdf")
            .eq("study_year", year)
            .in("quality_status", ["ocr_checked", "verified"])
            .order("id", { ascending: true })
            .range(start, start + PAGE_SIZE - 1);
          if (!mounted) return;
          if (fetchError) throw new Error(fetchError.message);
          const batch = (data ?? []) as MuhsRow[];
          all.push(...batch);
          if (batch.length < PAGE_SIZE) break;
        }
        if (mounted) setRows(all.sort(sorted));
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Unable to load MUHS questions.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, [year, retry]);

  const chooseYear = (next: MuhsYear) => {
    setYear(next);
    setSubject(null);
    setChapter(null);
    setSearch("");
    setType("essay");
  };
  const goBack = () => {
    if (chapter !== null) { setChapter(null); setSearch(""); return; }
    if (subject !== null) { setSubject(null); setSearch(""); return; }
    onBack();
  };
  useEffect(() => pushBackHandler(() => { goBack(); return true; }), [chapter, subject, onBack]);

  const activeSubject = SUBJECTS[year].find((s) => s.name === subject);
  const subjectRows = useMemo(() => rows.filter((r) => r.subject === subject), [rows, subject]);
  const chapters = useMemo(() => {
    const map = new Map<string, { firstPage: number; total: number }>();
    for (const r of subjectRows) {
      const key = r.chapter || "Other questions";
      const prev = map.get(key);
      if (prev) { prev.total++; prev.firstPage = Math.min(prev.firstPage, r.source_page); }
      else map.set(key, { firstPage: r.source_page, total: 1 });
    }
    return Array.from(map, ([name, meta]) => ({ name, ...meta }))
      .sort((a, b) => a.firstPage - b.firstPage || a.name.localeCompare(b.name));
  }, [subjectRows]);
  const questions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subjectRows
      .filter((r) => r.chapter === chapter && r.question_type === type &&
        (!q || r.question_text.toLowerCase().includes(q)))
      .sort(sorted);
  }, [subjectRows, chapter, type, search]);
  const questionCount = (t: QType) => subjectRows.filter((r) => r.chapter === chapter && r.question_type === t).length;

  return (
    <div className="space-y-4 pb-6">
      <header className="flex items-center gap-3 pt-2">
        <button type="button" onClick={goBack} aria-label="Back" className="h-10 w-10 rounded-full border border-border/60 bg-card flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-primary font-semibold tracking-wide">MAHARASHTRA UNIVERSITY OF HEALTH SCIENCES</p>
          <h2 className="text-xl font-extrabold truncate">MUHS Question Bank</h2>
          <p className="text-xs text-muted-foreground">{YEAR_LABELS[year]} · OCR-screened questions</p>
        </div>
      </header>

      <nav aria-label="MUHS MBBS year" className="grid grid-cols-3 gap-2">
        {YEAR_OPTIONS.map((y) => (
          <button key={y} type="button" onClick={() => chooseYear(y)}
            className={"rounded-lg px-2 py-2 text-sm font-semibold border " +
              (year === y ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border/60 text-muted-foreground")}>
            {YEAR_LABELS[y]}
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground" role="status">Loading checked MUHS questions…</div>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-destructive/50 p-4 space-y-3">
          <p className="text-sm text-destructive">Could not load MUHS questions: {error}</p>
          <button type="button" onClick={() => setRetry((v) => v + 1)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-primary-foreground">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      ) : subject === null ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Choose a subject. Only checked questions are displayed.</p>
          {SUBJECTS[year].map((s) => {
            const filtered = rows.filter((r) => r.subject === s.name);
            return (
              <button key={s.key} type="button" className={BROWSE_CLASS} onClick={() => { setSubject(s.name); setChapter(null); setSearch(""); }}>
                <span className="text-3xl">{s.icon}</span>
                <span className="flex-1 min-w-0"><span className="font-semibold block">{s.name}</span><span className="text-xs text-muted-foreground">{filtered.length} questions</span></span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            );
          })}
          {rows.length === 0 && <p className="text-sm text-muted-foreground py-4">No checked MUHS questions have been published for this year yet.</p>}
        </div>
      ) : chapter === null ? (
        <div className="space-y-3">
          <h3 className="text-lg font-bold">{activeSubject?.name ?? subject}</h3>
          <p className="text-xs text-muted-foreground">{chapters.length} chapters · {subjectRows.length} questions</p>
          {chapters.map((c) => (
            <button key={c.name} type="button" className={BROWSE_CLASS} onClick={() => { setChapter(c.name); setType("essay"); setSearch(""); requestDailyAd("questions"); }}>
              <span className="flex-1 font-medium">{c.name}</span>
              <span className="text-xs text-muted-foreground">{c.total}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ))}
          {chapters.length === 0 && <p className="text-sm text-muted-foreground py-6">No checked questions available in this subject yet.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="font-bold text-lg">{chapter}</h3>
          <p className="text-xs text-muted-foreground">{subject}</p>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl border border-border/60 bg-card">
            {(["essay", "short-notes"] as const).map((t) => (
              <button key={t} type="button" onClick={() => { setType(t); setSearch(""); }}
                className={"rounded-lg py-2 text-sm inline-flex justify-center items-center gap-2 " +
                  (type === t ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                {t === "essay" ? <BookOpen className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                {t === "essay" ? "Essays" : "Short Notes"} ({questionCount(t)})
              </button>
            ))}
          </div>
          <GoogleGateCard />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search MUHS questions…"
              className="w-full py-2.5 pl-10 pr-3 rounded-xl border border-border/60 bg-card text-sm" aria-label="Search MUHS questions" />
          </div>
          {questions.length ? questions.map((r, i) => (
            <div key={r.id}>
              <QuestionCard question={r.question_text} index={i} isFirstYear={year === "first-year"} yearKey={year}
                subjectKey={activeSubject?.key} subjectName={subject} />
              <p className="text-[10px] text-muted-foreground text-right -mt-1 mr-2 mb-2">MUHS · Source PDF page {r.source_page}</p>
            </div>
          )) : <p className="text-sm text-muted-foreground text-center py-8">No {type === "essay" ? "essays" : "short notes"} found in this chapter.</p>}
          <span className="sr-only">{progressTick} progress updates</span>
        </div>
      )}
    </div>
  );
}
