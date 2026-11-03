import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import QuestionCard from "@/components/QuestionCard";

type MuhsYear = "1st Year" | "2nd Year" | "3rd Year Part 1" | "Final Year";
type MuhsQuestion = {
  id: string;
  study_year: MuhsYear;
  subject: string;
  chapter: string;
  question_type: string;
  question_number: number;
  question_text: string;
  source_pdf: string;
  source_page: number;
  quality_status: string;
};

const YEAR_SUBJECTS: Record<MuhsYear, string[]> = {
  "1st Year": ["Anatomy", "Physiology", "Biochemistry"],
  "2nd Year": ["Pathology", "Pharmacology", "Microbiology"],
  "3rd Year Part 1": ["Community Medicine (PSM)", "Forensic Medicine"],
  "Final Year": [
    "General Medicine",
    "General Surgery",
    "Obstetrics & Gynaecology",
    "Paediatrics",
    "Orthopaedics",
    "Anaesthesiology",
  ],
};
const PAGE_SIZE = 500;
const DISPLAY_STEP = 40;
const yearKeyFor = (year: MuhsYear) => (
  year === "1st Year" ? "first-year" :
  year === "2nd Year" ? "second-year" :
  year === "3rd Year Part 1" ? "third-year" : "final-year"
);
const normalizeText = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");

export default function MuhsQuestionBank() {
  const [year, setYear] = useState<MuhsYear>("1st Year");
  const [subject, setSubject] = useState("Anatomy");
  const [type, setType] = useState<"essay" | "short-notes">("essay");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<MuhsQuestion[]>([]);
  const [visible, setVisible] = useState(DISPLAY_STEP);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const table = year === "Final Year" ? "muhs_final_year_questions" : "muhs_pre_final_questions";
    setLoading(true);
    setRows([]);
    setError("");

    async function fetchQuestions() {
      const collected: MuhsQuestion[] = [];
      for (let offset = 0; offset < 10000; offset += PAGE_SIZE) {
        // These new tables are not yet in the generated Supabase TypeScript types.
        const query = (supabase as any)
          .from(table)
          .select("id,study_year,subject,chapter,question_type,question_number,question_text,source_pdf,source_page,quality_status")
          .eq("study_year", year)
          .eq("subject", subject)
          .order("source_page", { ascending: true })
          .order("source_column", { ascending: true })
          .order("question_number", { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);
        const { data, error: fetchError } = await query;
        if (cancelled) return;
        if (fetchError) {
          setError(fetchError.message || "Unable to load MUHS questions.");
          setLoading(false);
          return;
        }
        const batch = (data || []) as MuhsQuestion[];
        collected.push(...batch);
        if (batch.length < PAGE_SIZE) break;
      }
      if (!cancelled) {
        setRows(collected);
        setLoading(false);
      }
    }
    void fetchQuestions();
    return () => { cancelled = true; };
  }, [year, subject, retry]);

  useEffect(() => { setVisible(DISPLAY_STEP); }, [year, subject, type, search]);

  const filtered = useMemo(() => {
    const lower = search.trim().toLowerCase();
    const seen = new Set<string>();
    return rows.filter(row => {
      if (row.question_type !== type || (lower && !(
        row.question_text.toLowerCase().includes(lower) ||
        row.chapter.toLowerCase().includes(lower)
      ))) return false;
      const key = [row.subject, row.chapter, row.question_type, normalizeText(row.question_text)].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [rows, type, search]);

  const groups = useMemo(() => {
    const chapters = new Map<string, MuhsQuestion[]>();
    filtered.slice(0, visible).forEach(row => {
      const chapter = row.chapter?.trim() || "Unclassified chapter";
      if (!chapters.has(chapter)) chapters.set(chapter, []);
      chapters.get(chapter)!.push(row);
    });
    return [...chapters.entries()];
  }, [filtered, visible]);

  function changeYear(next: MuhsYear) {
    setYear(next);
    setSubject(YEAR_SUBJECTS[next][0]);
    setSearch("");
    setType("essay");
  }

  return (
    <section className="space-y-4 py-2" aria-label="MUHS question bank">
      <p className="text-sm text-muted-foreground">
        Maharashtra University of Health Sciences (MUHS) previous-year questions,
        organized by MBBS year, subject and chapter.
      </p>
      <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        These questions were extracted by OCR from uploaded PDF compilations.
        They have not been independently verified. Check the original page before
        relying on exact question wording.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          MBBS year
          <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
            value={year} onChange={event => changeYear(event.target.value as MuhsYear)}>
            {Object.keys(YEAR_SUBJECTS).map(value => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Subject
          <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
            value={subject} onChange={event => setSubject(event.target.value)}>
            {YEAR_SUBJECTS[year].map(value => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Question type">
        {(["essay", "short-notes"] as const).map(value => (
          <button key={value} type="button" onClick={() => setType(value)}
            aria-pressed={type === value}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${type === value ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted"}`}>
            {value === "essay" ? "Essay" : "Short notes"}
          </button>
        ))}
      </div>
      <input type="search" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search MUHS questions or chapters..."
        aria-label="Search MUHS questions"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" />

      {loading && <p className="py-5 text-center text-sm text-muted-foreground">Loading MUHS questions…</p>}
      {error && (
        <div role="alert" className="rounded-md border p-3 text-sm">
          <p>Unable to load MUHS questions: {error}</p>
          <button type="button" className="mt-2 underline" onClick={() => setRetry(n => n + 1)}>Retry</button>
        </div>
      )}
      {!loading && !error && (
        <>
          <p className="text-xs text-muted-foreground">{filtered.length} {type === "essay" ? "essays" : "short notes"} for {subject}</p>
          {filtered.length === 0 && <p className="py-4 text-sm">No matching questions in this section.</p>}
          {groups.map(([chapter, questions]) => (
            <details key={chapter} open className="rounded-lg border border-border p-3">
              <summary className="cursor-pointer font-semibold text-sm">{chapter} ({questions.length}{filtered.length > visible ? " shown" : ""})</summary>
              <div className="mt-3 space-y-3">
                {questions.map((item, index) => (
                  <div key={item.id} className="space-y-1">
                    <QuestionCard question={item.question_text} index={index}
                      isFirstYear={year === "1st Year"} yearKey={yearKeyFor(year)}
                      subjectName={subject} />
                    <p className="px-2 text-xs text-muted-foreground">
                      Source: {item.source_pdf}, PDF page {item.source_page}
                      {item.quality_status === "needs_review" ? " · OCR review needed" : " · OCR extracted"}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          ))}
          {visible < filtered.length && (
            <button type="button" onClick={() => setVisible(n => n + DISPLAY_STEP)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">
              Show more ({Math.min(DISPLAY_STEP, filtered.length - visible)} more)
            </button>
          )}
        </>
      )}
    </section>
  );
}
