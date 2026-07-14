import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Loader2, RefreshCw, Sparkles, GraduationCap, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { YEAR_LABELS, getYearSubjects, type Year } from "@/lib/year-subjects";
import { collectQuestions } from "@/lib/question-progress";
import HandwrittenNotesView, { type NotesContent } from "./HandwrittenNotesView";

/** Walk a subject node and return every leaf topic that has at least one essay or short-note question. */
interface LeafTopic {
  key: string;          // stable path key
  name: string;         // topic display name (last segment)
  breadcrumb: string;   // "Paper 1 › Cell Injury"
  questions: string[];
}

function flattenSubjectTopics(subjectKey: string, node: any): LeafTopic[] {
  const out: LeafTopic[] = [];
  function walk(n: any, keyPath: string[], namePath: string[]) {
    if (!n || typeof n !== "object") return;
    // If this node itself has essay/short-note arrays -> it's a leaf topic.
    const essay = collectQuestions(n, "essay");
    const shorts = collectQuestions(n, "short-notes");
    const unique = Array.from(new Set([...essay, ...shorts])).filter(Boolean);
    const hasChildren = n.subtopics && typeof n.subtopics === "object";
    if (unique.length > 0 && (!hasChildren || Object.keys(n.subtopics).length === 0 || isLeafShape(n))) {
      out.push({
        key: `${subjectKey}::${keyPath.join("/")}`,
        name: namePath[namePath.length - 1] ?? n.name ?? "Topic",
        breadcrumb: namePath.join(" › "),
        questions: unique,
      });
      return;
    }
    if (hasChildren) {
      for (const [k, v] of Object.entries<any>(n.subtopics)) {
        walk(v, [...keyPath, k], [...namePath, v?.name ?? k]);
      }
    }
  }
  walk(node, [], [node?.name ?? subjectKey]);
  // dedupe by key
  const seen = new Set<string>();
  return out.filter((t) => (seen.has(t.key) ? false : (seen.add(t.key), true)));
}

/** A node is a leaf shape when its subtopics are only essay/short-notes arrays (no further named topics). */
function isLeafShape(n: any) {
  if (!n?.subtopics) return true;
  const keys = Object.keys(n.subtopics);
  return keys.every((k) => k === "essay" || k === "short-note" || k === "short-notes" || Array.isArray(n.subtopics[k]?.questions));
}

type View =
  | { kind: "years" }
  | { kind: "subjects"; year: Year }
  | { kind: "topics"; year: Year; subjectKey: string; subjectName: string; node: any }
  | { kind: "notes"; year: Year; subject: string; topic: LeafTopic };

export default function HandwrittenNotesHub() {
  const [view, setView] = useState<View>({ kind: "years" });

  return (
    <div className="animate-fade-in">
      {view.kind === "years" && (
        <YearsView onPick={(year) => setView({ kind: "subjects", year })} />
      )}
      {view.kind === "subjects" && (
        <SubjectsView
          year={view.year}
          onBack={() => setView({ kind: "years" })}
          onPick={(subjectKey, subjectName, node) =>
            setView({ kind: "topics", year: view.year, subjectKey, subjectName, node })
          }
        />
      )}
      {view.kind === "topics" && (
        <TopicsView
          year={view.year}
          subjectKey={view.subjectKey}
          subjectName={view.subjectName}
          node={view.node}
          onBack={() => setView({ kind: "subjects", year: view.year })}
          onPick={(topic) => setView({ kind: "notes", year: view.year, subject: view.subjectName, topic })}
        />
      )}
      {view.kind === "notes" && (
        <NotesDetailView
          year={view.year}
          subject={view.subject}
          topic={view.topic}
          onBack={() =>
            setView({ kind: "topics", year: view.year, subjectKey: view.topic.key.split("::")[0], subjectName: view.subject, node: getYearSubjects(view.year).find(s => s.key === view.topic.key.split("::")[0])?.node })
          }
        />
      )}
    </div>
  );
}

/** ---------- Views ---------- */

const YEARS: Year[] = ["first", "second", "third", "final"];
const YEAR_ICONS: Record<Year, string> = { first: "🩺", second: "💊", third: "⚖️", final: "🏥" };

function YearsView({ onPick }: { onPick: (y: Year) => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-900 via-blue-800 to-blue-950 text-white p-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4" />
          <p className="text-[10px] tracking-widest uppercase">AI Generated</p>
        </div>
        <h2 className="text-2xl font-extrabold">Handwritten Notes</h2>
        <p className="text-sm text-blue-100 mt-1">
          Pick a year → subject → topic. We synthesize an exam-ready page from every essay & short-note in that topic.
        </p>
      </div>
      <p className="text-xs tracking-widest text-muted-foreground">SELECT YEAR</p>
      <div className="grid grid-cols-2 gap-3">
        {YEARS.map((y, i) => (
          <button
            key={y}
            onClick={() => onPick(y)}
            className="rounded-2xl border bg-card p-4 text-left hover:shadow-md hover:border-primary/40 transition-all animate-fade-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="text-3xl mb-2">{YEAR_ICONS[y]}</div>
            <p className="font-bold">{YEAR_LABELS[y]}</p>
            <p className="text-xs text-muted-foreground mt-1">Tap to browse subjects</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function SubjectsView({ year, onBack, onPick }: {
  year: Year; onBack: () => void; onPick: (k: string, n: string, node: any) => void;
}) {
  const subjects = useMemo(() => getYearSubjects(year), [year]);
  return (
    <div className="space-y-3">
      <BackHeader onBack={onBack} title={`${YEAR_LABELS[year]} • Subjects`} />
      {subjects.map((s, i) => (
        <button
          key={s.key}
          onClick={() => onPick(s.key, s.name, s.node)}
          className="w-full rounded-xl bg-card border p-3 flex items-center gap-3 text-left hover:shadow-md hover:border-primary/40 transition-all animate-fade-in"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-blue-500/20 text-primary flex items-center justify-center flex-shrink-0">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{s.name}</p>
            <p className="text-[11px] text-muted-foreground">Tap to see topics</p>
          </div>
        </button>
      ))}
    </div>
  );
}

function TopicsView({
  year, subjectKey, subjectName, node, onBack, onPick,
}: {
  year: Year; subjectKey: string; subjectName: string; node: any;
  onBack: () => void; onPick: (t: LeafTopic) => void;
}) {
  const topics = useMemo(() => flattenSubjectTopics(subjectKey, node), [subjectKey, node]);
  return (
    <div className="space-y-3">
      <BackHeader onBack={onBack} title={`${subjectName}`} subtitle={`${YEAR_LABELS[year]} • ${topics.length} topics`} />
      {topics.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No topics with questions found.</p>
      )}
      {topics.map((t, i) => (
        <button
          key={t.key}
          onClick={() => onPick(t)}
          className="w-full rounded-xl bg-card border p-3 flex items-center gap-3 text-left hover:shadow-md hover:border-primary/40 transition-all animate-fade-in"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <div className="h-10 w-10 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{t.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{t.breadcrumb}</p>
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-1 rounded">
            {t.questions.length} Q
          </span>
        </button>
      ))}
    </div>
  );
}

function NotesDetailView({
  year, subject, topic, onBack,
}: { year: Year; subject: string; topic: LeafTopic; onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<NotesContent | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  async function load(regenerate = false) {
    setError(null);
    if (regenerate) setRegenerating(true); else setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-handwritten-notes", {
        body: {
          subtopicKey: topic.key,
          year: YEAR_LABELS[year],
          subject,
          subtopicName: topic.name,
          questions: topic.questions,
          regenerate,
        },
      });
      if (error) {
        let realMsg = error.message ?? "Failed to generate notes";
        try {
          const ctx = (error as any).context;
          if (ctx?.json) {
            const j = await ctx.json();
            if (j?.error) realMsg = typeof j.error === "string" ? j.error : JSON.stringify(j.error);
          } else if (ctx?.text) {
            const t = await ctx.text();
            if (t) realMsg = t.slice(0, 300);
          }
        } catch { /* ignore */ }
        throw new Error(realMsg);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      setContent((data as any).content);
    } catch (e: any) {
      setError(e?.message ?? "Failed to generate notes");
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  }

  useEffect(() => { load(false); /* eslint-disable-next-line */ }, [topic.key]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BackHeader onBack={onBack} title={topic.name} subtitle={`${subject} • ${YEAR_LABELS[year]}`} />
      </div>

      {loading && (
        <div className="rounded-2xl border bg-card p-8 flex flex-col items-center justify-center text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="font-medium">Generating handwritten notes…</p>
          <p className="text-xs text-muted-foreground mt-1">
            Synthesizing {topic.questions.length} essay & short-note questions
          </p>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 dark:bg-rose-950/20 p-4">
          <p className="text-sm text-rose-700 dark:text-rose-300 font-medium">Couldn't generate notes</p>
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{error}</p>
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-2">
            <p className="text-[11px] text-amber-800 dark:text-amber-200">
              ⚡ Handwritten Notes is in <b>Beta</b>. AI generation can occasionally fail — please try again in a minute.
            </p>
          </div>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => load(false)}>Try again</Button>
        </div>
      )}

      {content && !loading && (
        <>
          {Array.isArray((content as any).warnings) && (content as any).warnings.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                Partial notes — {(content as any).warnings.length} batch(es) failed
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">
                Tap Regenerate later to fill in the missing parts.
              </p>
            </div>
          )}
          <HandwrittenNotesView subtopicName={topic.name} content={content} />
          <div className="flex justify-center pt-2">
            <Button variant="outline" size="sm" onClick={() => load(true)} disabled={regenerating}>
              {regenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Regenerate
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function BackHeader({ onBack, title, subtitle }: { onBack: () => void; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <button
        onClick={onBack}
        className="h-9 w-9 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center transition"
        aria-label="Back"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-bold truncate flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
          {title}
        </p>
        {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
      </div>
    </div>
  );
}
