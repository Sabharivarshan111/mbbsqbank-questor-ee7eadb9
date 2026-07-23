import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Loader2, RefreshCw, Sparkles, GraduationCap, Layers, Send, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

/** Merge multiple batch payloads into one NotesContent (client-side). */
function mergeNotes(parts: NotesContent[]): NotesContent {
  const merged: any = { highYieldTip: "", pyqYears: [], sections: [] };
  const extraTips: string[] = [];
  const yearSet = new Set<string>();
  const byTitle = new Map<string, any>();
  for (const p of parts) {
    if (!p) continue;
    if (p.highYieldTip) {
      if (!merged.highYieldTip) merged.highYieldTip = p.highYieldTip;
      else extraTips.push(p.highYieldTip);
    }
    if (Array.isArray(p.pyqYears)) p.pyqYears.forEach((y) => y && yearSet.add(String(y)));
    if (Array.isArray(p.sections)) {
      for (const s of p.sections) {
        const key = (s?.title ?? "").toLowerCase().trim();
        if (!key) { merged.sections.push(s); continue; }
        const existing = byTitle.get(key);
        if (!existing) {
          byTitle.set(key, s);
          merged.sections.push(s);
        } else if (existing.payload?.items && s.payload?.items && Array.isArray(existing.payload.items)) {
          existing.payload.items = [...existing.payload.items, ...s.payload.items];
        }
      }
    }
  }
  if (extraTips.length) merged.highYieldTip = (merged.highYieldTip + " " + extraTips.join(" ")).trim();
  merged.pyqYears = Array.from(yearSet).sort();
  return merged as NotesContent;
}

/** Delay between Gemini batch requests — keeps direct Google AI Studio keys under safer throughput. */
const INTER_BATCH_DELAY_MS = 25_000;
const NOTES_BATCH_SIZE = 10;

function NotesDetailView({
  year, subject, topic, onBack,
}: { year: Year; subject: string; topic: LeafTopic; onBack: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<NotesContent | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  // batch state
  const [totalBatches, setTotalBatches] = useState<number>(0);
  const [completedBatches, setCompletedBatches] = useState<number>(0);
  const [phase, setPhase] = useState<"idle" | "loading" | "waiting" | "done">("idle");
  const [waitSecs, setWaitSecs] = useState<number>(0);
  const [failedBatches, setFailedBatches] = useState<number[]>([]);
  const [editInstruction, setEditInstruction] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);

  async function callBatch(batchIndex: number, regenerate: boolean) {
    const { data, error: fnErr } = await supabase.functions.invoke("generate-handwritten-notes", {
      body: {
        subtopicKey: topic.key,
        year: YEAR_LABELS[year],
        subject,
        subtopicName: topic.name,
        questions: topic.questions,
        batchIndex,
        batchSize: NOTES_BATCH_SIZE,
        regenerate: regenerate && batchIndex === 0,
      },
    });
    if (fnErr) {
      let realMsg = fnErr.message ?? "Failed";
      try {
        const ctx = (fnErr as any).context;
        if (ctx?.json) {
          const j = await ctx.json();
          if (j?.error) realMsg = typeof j.error === "string" ? j.error : JSON.stringify(j.error);
        } else if (ctx?.text) {
          const t = await ctx.text();
          if (t) realMsg = t.slice(0, 300);
        }
      } catch {}
      throw new Error(realMsg);
    }
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as {
      cached: boolean; content: NotesContent;
      batchIndex: number; totalBatches: number; hasMore: boolean;
      estSecondsPerBatch: number;
    };
  }

  async function saveMerged(merged: NotesContent) {
    try {
      await supabase.functions.invoke("generate-handwritten-notes", {
        body: {
          subtopicKey: topic.key,
          year: YEAR_LABELS[year],
          subject,
          subtopicName: topic.name,
          questions: topic.questions,
          saveContent: true,
          content: merged,
        },
      });
    } catch { /* non-fatal */ }
  }

  async function applyAiEdit() {
    const instruction = editInstruction.trim();
    if (!instruction || !content) return;
    setEditingNotes(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("generate-handwritten-notes", {
        body: {
          subtopicKey: topic.key,
          year: YEAR_LABELS[year],
          subject,
          subtopicName: topic.name,
          questions: topic.questions,
          content,
          editInstruction: instruction,
        },
      });
      if (fnErr) {
        let realMsg = fnErr.message ?? "Failed";
        try {
          const ctx = (fnErr as any).context;
          if (ctx?.json) {
            const j = await ctx.json();
            if (j?.error) realMsg = typeof j.error === "string" ? j.error : JSON.stringify(j.error);
          } else if (ctx?.text) {
            const t = await ctx.text();
            if (t) realMsg = t.slice(0, 300);
          }
        } catch {}
        throw new Error(realMsg);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      const updated = (data as any)?.content as NotesContent | undefined;
      if (!updated?.sections) throw new Error("AI edit returned invalid notes.");
      setContent(updated);
      setEditInstruction("");
      setPhase("done");
    } catch (e: any) {
      setError(e?.message ?? "Couldn't update notes");
    } finally {
      setEditingNotes(false);
    }
  }

  async function load(regenerate = false) {
    setError(null);
    setContent(null);
    setCompletedBatches(0);
    setFailedBatches([]);
    if (regenerate) setRegenerating(true);
    setPhase("loading");
    const collected: NotesContent[] = [];
    const failed: number[] = [];

    try {
      // Batch 0
      const first = await callBatch(0, regenerate);
      // Cache hit path
      if (first.cached) {
        setContent(first.content);
        setTotalBatches(1);
        setCompletedBatches(1);
        setPhase("done");
        setRegenerating(false);
        return;
      }
      collected.push(first.content);
      setContent(first.content);
      setTotalBatches(first.totalBatches);
      setCompletedBatches(1);

      // Remaining batches
      for (let i = 1; i < first.totalBatches; i++) {
        // Countdown before next call
        setPhase("waiting");
        for (let s = Math.ceil(INTER_BATCH_DELAY_MS / 1000); s > 0; s--) {
          setWaitSecs(s);
          await new Promise((r) => setTimeout(r, 1000));
        }
        setPhase("loading");
        try {
          const next = await callBatch(i, false);
          collected.push(next.content);
          setContent(mergeNotes(collected));
          setCompletedBatches(i + 1);
        } catch (e: any) {
          failed.push(i + 1);
          setFailedBatches([...failed]);
        }
      }

      setPhase("done");
      // Persist merged notes (only if at least one batch succeeded and no failures — keeps cache clean)
      if (collected.length === first.totalBatches && failed.length === 0) {
        const merged = collected.length === 1 ? collected[0] : mergeNotes(collected);
        await saveMerged(merged);
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to generate notes");
      setPhase("idle");
    } finally {
      setRegenerating(false);
    }
  }

  useEffect(() => { load(false); /* eslint-disable-next-line */ }, [topic.key]);

  const initialLoading = phase === "loading" && !content;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BackHeader onBack={onBack} title={topic.name} subtitle={`${subject} • ${YEAR_LABELS[year]}`} />
      </div>

      {initialLoading && (
        <div className="rounded-2xl border bg-card p-8 flex flex-col items-center justify-center text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="font-medium">Generating first section…</p>
          <p className="text-xs text-muted-foreground mt-1">
            {topic.questions.length} questions • ~15s per section
          </p>
        </div>
      )}

      {error && !content && (
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

      {error && content && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">AI update notice</p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{error}</p>
        </div>
      )}

      {content && (
        <>
          {totalBatches > 1 && (
            <div className="rounded-xl border bg-card p-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold">
                    Section {completedBatches} of {totalBatches}
                  </span>
                  <span className="text-muted-foreground">
                    {phase === "waiting" && `Next in ${waitSecs}s`}
                    {phase === "loading" && "Generating…"}
                    {phase === "done" && "Complete"}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${(completedBatches / totalBatches) * 100}%` }}
                  />
                </div>
              </div>
              {(phase === "loading" || phase === "waiting") && (
                <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
              )}
            </div>
          )}

          {failedBatches.length > 0 && phase === "done" && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                {failedBatches.length} section(s) failed — showing the completed notes we have. Tap Regenerate to retry the full topic.
              </p>
            </div>
          )}

          <HandwrittenNotesView subtopicName={topic.name} content={content} />

          {phase === "done" && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" size="sm" onClick={() => load(true)} disabled={regenerating}>
                {regenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Regenerate
              </Button>
            </div>
          )}

          {phase === "done" && (
            <div className="rounded-2xl border bg-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <Wand2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm">Fix these notes with AI</p>
                  <p className="text-xs text-muted-foreground">Ask for a specific change; only the relevant part will be updated.</p>
                </div>
              </div>
              <Textarea
                value={editInstruction}
                onChange={(e) => setEditInstruction(e.target.value)}
                placeholder="Example: Add the typhoid agent factors and make the transmission part a flowchart."
                rows={3}
                disabled={editingNotes}
              />
              <Button
                className="w-full"
                onClick={applyAiEdit}
                disabled={editingNotes || !editInstruction.trim()}
              >
                {editingNotes ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Update notes
              </Button>
            </div>
          )}
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
