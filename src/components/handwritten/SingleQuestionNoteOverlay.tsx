import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import HandwrittenNotesView, { NotesContent } from "./HandwrittenNotesView";

interface Payload {
  question: string;
  subject: string;
  subjectKey: string;
  year: string;
}

function hashKey(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

export default function SingleQuestionNoteOverlay() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<NotesContent | null>(null);
  const [runId, setRunId] = useState(0);
  const [forceRegen, setForceRegen] = useState(false);
  const abortRef = useRef<boolean>(false);

  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent).detail as Payload | undefined;
      if (!d?.question) return;
      setPayload(d);
      setOpen(true);
      setContent(null);
      setError(null);
      setForceRegen(false);
      setRunId((r) => r + 1);
    };
    window.addEventListener("orbit:single-note", h);
    return () => window.removeEventListener("orbit:single-note", h);
  }, []);

  useEffect(() => {
    if (!open || !payload) return;
    abortRef.current = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const subtopicName = payload.question.slice(0, 80);
        const key = `single::${payload.subjectKey}::${hashKey(payload.question)}`;
        // IMPORTANT: do NOT force regenerate by default. Cached answers avoid Gemini quota.
        const { data, error: err } = await supabase.functions.invoke("generate-handwritten-notes", {
          body: {
            subtopicKey: key,
            year: payload.year,
            subject: payload.subject,
            subtopicName,
            questions: [payload.question],
            singleMode: true,
            regenerate: forceRegen,
          },
        });
        if (abortRef.current) return;
        if (err) throw err;
        if ((data as any)?.error) throw new Error((data as any).error);
        const c = (data as any)?.content;
        if (!c) throw new Error("Empty response");
        setContent(c);
      } catch (e: any) {
        if (abortRef.current) return;
        setError(e?.message || "Couldn't generate note. Please retry.");
      } finally {
        if (!abortRef.current) setLoading(false);
      }
    };
    run();
    return () => { abortRef.current = true; };
  }, [open, payload, runId, forceRegen]);

  if (!open) return null;

  const node = (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-stretch justify-center">
      <div className="w-full max-w-2xl bg-background border border-border/60 shadow-2xl overflow-y-auto animate-in fade-in slide-in-from-bottom-4">
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-background/95 backdrop-blur border-b border-border/60">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-primary">Handwritten Note</p>
            <p className="text-sm font-semibold truncate">{payload?.question}</p>
          </div>
          {content && !loading && (
            <button
              onClick={() => { setForceRegen(true); setRunId((r) => r + 1); }}
              aria-label="Regenerate"
              className="h-9 w-9 rounded-full border border-border/60 flex items-center justify-center hover:border-primary/50 active:scale-95 transition"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="h-9 w-9 rounded-full border border-border/60 flex items-center justify-center hover:border-primary/50 active:scale-95 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Generating handwritten note…</p>
              <p className="text-xs">Using textbook grounding + Gemini 3.1 Flash-Lite</p>
            </div>
          )}
          {error && !loading && (
            <div className="p-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-sm text-rose-700 dark:text-rose-200">
              <p className="font-semibold mb-2">Couldn't generate this note.</p>
              <p className="text-xs mb-3">{error}</p>
              <button
                onClick={() => { setForceRegen(true); setRunId((r) => r + 1); }}
                className="text-xs font-semibold underline"
              >
                Try again
              </button>
            </div>
          )}
          {content && !loading && (
            <div className="space-y-4">
              <HandwrittenNotesView subtopicName={payload?.question || ""} content={content} />
              <NotesAiEditBox
                compact
                subtopicKey={`single::${payload!.subjectKey}::${hashKey(payload!.question)}`}
                year={payload!.year}
                subject={payload!.subject}
                subtopicName={payload!.question.slice(0, 80)}
                questions={[payload!.question]}
                content={content}
                onApply={(next) => setContent(next)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
