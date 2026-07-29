import { useRef, useState } from "react";
import { Loader2, Send, Wand2, BookOpen, Check, X, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { NotesContent } from "./HandwrittenNotesView";

type Bubble =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "status"; text: string }
  | { id: number; role: "error"; text: string }
  | {
      id: number;
      role: "proposal";
      source: "textbook" | "knowledge" | "web";
      found: boolean;
      summary: string[];
      content: NotesContent;
      state: "pending" | "accepted" | "rejected";
    }
  | { id: number; role: "offer-web"; state: "pending" | "done" };

interface Props {
  subtopicKey: string;
  year: string;
  subject: string;
  subtopicName: string;
  questions: string[];
  content: NotesContent | null;
  onApply: (next: NotesContent) => void;
  compact?: boolean;
}

async function invokeNotes(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("generate-handwritten-notes", { body });
  if (error) {
    let msg = error.message ?? "Request failed";
    try {
      const ctx = (error as any).context;
      if (ctx?.json) {
        const j = await ctx.json();
        if (j?.error) msg = typeof j.error === "string" ? j.error : JSON.stringify(j.error);
      } else if (ctx?.text) {
        const t = await ctx.text();
        if (t) msg = t.slice(0, 300);
      }
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
}

export default function NotesAiEditBox({
  subtopicKey, year, subject, subtopicName, questions, content, onApply, compact,
}: Props) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const idRef = useRef(0);
  const lastInstruction = useRef("");

  const nextId = () => ++idRef.current;
  const push = (b: Omit<Bubble, "id">) => setBubbles((prev) => [...prev, { ...(b as any), id: nextId() }]);
  const patch = (id: number, changes: Partial<Bubble>) =>
    setBubbles((prev) => prev.map((b) => (b.id === id ? ({ ...b, ...changes } as Bubble) : b)));

  async function propose(instruction: string, useWeb: boolean) {
    if (!content) return;
    setBusy(true);
    const statusId = nextId();
    setBubbles((prev) => [
      ...prev,
      {
        id: statusId,
        role: "status",
        text: useWeb ? "Searching the web for this topic…" : "Searching the topic in the reference textbook…",
      } as Bubble,
    ]);
    try {
      const data = await invokeNotes({
        subtopicKey, year, subject, subtopicName, questions,
        content,
        editInstruction: instruction,
        proposeOnly: true,
        useWeb,
      });
      const source: "textbook" | "knowledge" | "web" = data?.source ?? (useWeb ? "web" : "knowledge");
      patch(statusId, {
        text:
          source === "textbook"
            ? "Found this in the reference textbook:"
            : source === "web"
              ? "Found this on the web:"
              : "Not in the reference textbook — drafted this from standard MBBS knowledge:",
      } as Partial<Bubble>);
      push({
        role: "proposal",
        source,
        found: !!data?.found,
        summary: Array.isArray(data?.summary) ? data.summary : [],
        content: data.content as NotesContent,
        state: "pending",
      } as Omit<Bubble, "id">);
    } catch (e: any) {
      patch(statusId, { role: "error", text: e?.message ?? "Couldn't process that request." } as Partial<Bubble>);
    } finally {
      setBusy(false);
    }
  }

  async function accept(b: Extract<Bubble, { role: "proposal" }>) {
    patch(b.id, { state: "accepted" } as Partial<Bubble>);
    onApply(b.content);
    push({ role: "status", text: "Added to your notes ✅" } as Omit<Bubble, "id">);
    try {
      await invokeNotes({
        subtopicKey, year, subject, subtopicName, questions,
        saveContent: true, content: b.content,
      });
    } catch { /* non-fatal: the UI already shows the update */ }
  }

  function reject(b: Extract<Bubble, { role: "proposal" }>) {
    patch(b.id, { state: "rejected" } as Partial<Bubble>);
    if (b.source === "web") {
      push({ role: "status", text: "Discarded. Try rewording your request." } as Omit<Bubble, "id">);
    } else {
      push({ role: "offer-web", state: "pending" } as Omit<Bubble, "id">);
    }
  }

  const submit = () => {
    const q = input.trim();
    if (!q || !content || busy) return;
    lastInstruction.current = q;
    setInput("");
    push({ role: "user", text: q } as Omit<Bubble, "id">);
    void propose(q, false);
  };

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <Wand2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm">Fix these notes with AI</p>
          <p className="text-xs text-muted-foreground">
            Ask for a change — I check the reference textbook first, show you what I found, then you approve it.
          </p>
        </div>
      </div>

      {bubbles.length > 0 && (
        <div className={`space-y-2 overflow-y-auto pr-1 ${compact ? "max-h-72" : "max-h-96"}`}>
          {bubbles.map((b) => {
            if (b.role === "user") {
              return (
                <div key={b.id} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground text-sm px-3 py-2">
                    {b.text}
                  </p>
                </div>
              );
            }
            if (b.role === "status") {
              return (
                <div key={b.id} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>{b.text}</span>
                  {busy && b.id === idRef.current && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                </div>
              );
            }
            if (b.role === "error") {
              return (
                <div key={b.id} className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-700 dark:text-rose-200">
                  {b.text}
                </div>
              );
            }
            if (b.role === "offer-web") {
              return (
                <div key={b.id} className="rounded-2xl border bg-muted/40 p-3 space-y-2">
                  <p className="text-sm">Want me to search the internet for this instead?</p>
                  {b.state === "pending" ? (
                    <div className="flex gap-2">
                      <button
                        disabled={busy}
                        onClick={() => {
                          patch(b.id, { state: "done" } as Partial<Bubble>);
                          void propose(lastInstruction.current, true);
                        }}
                        className="flex-1 h-9 rounded-lg bg-emerald-600 text-white text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition disabled:opacity-50"
                      >
                        <Globe className="h-4 w-4" /> Yes, search the web
                      </button>
                      <button
                        onClick={() => patch(b.id, { state: "done" } as Partial<Bubble>)}
                        className="flex-1 h-9 rounded-lg bg-rose-600 text-white text-sm font-semibold active:scale-[0.98] transition"
                      >
                        No, leave it
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Answered.</p>
                  )}
                </div>
              );
            }
            // proposal
            return (
              <div key={b.id} className="rounded-2xl border bg-muted/40 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded ${
                    b.source === "textbook"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : b.source === "web"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                  }`}>
                    {b.source === "textbook" ? "FROM TEXTBOOK" : b.source === "web" ? "FROM WEB" : "AI KNOWLEDGE"}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {b.summary.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                      <span className="leading-relaxed">{s}</span>
                    </li>
                  ))}
                  {b.summary.length === 0 && (
                    <li className="text-sm text-muted-foreground">Ready to apply this change to your notes.</li>
                  )}
                </ul>
                {b.state === "pending" ? (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => void accept(b)}
                      className="flex-1 h-9 rounded-lg bg-emerald-600 text-white text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition"
                    >
                      <Check className="h-4 w-4" /> Yes, add to notes
                    </button>
                    <button
                      onClick={() => reject(b)}
                      className="flex-1 h-9 rounded-lg bg-rose-600 text-white text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition"
                    >
                      <X className="h-4 w-4" /> No, reject
                    </button>
                  </div>
                ) : (
                  <p className={`text-xs font-semibold ${b.state === "accepted" ? "text-emerald-600" : "text-rose-600"}`}>
                    {b.state === "accepted" ? "Added to your notes." : "Rejected."}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
          }}
          placeholder="Example: The Anaemia Mukt Bharat strategy is 6x6x6, please fix it."
          rows={2}
          disabled={busy || !content}
          className="flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60 disabled:opacity-60"
        />
        <button
          onClick={submit}
          disabled={busy || !input.trim() || !content}
          className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 active:scale-95 transition"
          aria-label="Send"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
