import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X as XIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface Mcq { question: string; options: string[]; correctIndex: number; explanation: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  subject: string;
  questions: string[];
}

const QuizSession = ({ open, onClose, subject, questions }: Props) => {
  const [loading, setLoading] = useState(false);
  const [mcqs, setMcqs] = useState<Mcq[]>([]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true); setMcqs([]); setI(0); setPicked(null); setScore(0); setDone(false);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("quiz-from-subtopic", {
          body: { subject, questions: questions.slice(0, 20) },
        });
        if (error) throw error;
        const list = (data as any)?.mcqs as Mcq[];
        if (!Array.isArray(list) || list.length === 0) throw new Error("No MCQs returned");
        setMcqs(list);
      } catch (e: any) {
        toast({ title: "Quiz unavailable", description: e?.message ?? "Try again later.", variant: "destructive" });
        onClose();
      } finally {
        setLoading(false);
      }
    })();
  }, [open, subject, questions, onClose]);

  const cur = mcqs[i];
  const correct = picked === cur?.correctIndex;

  const next = async () => {
    if (i + 1 >= mcqs.length) {
      setDone(true);
      if (score > 0) {
        await (supabase as any).rpc("award_quiz_xp", { _amount: score });
      }
    } else {
      setI(i + 1); setPicked(null);
    }
  };

  const choose = (idx: number) => {
    if (picked !== null) return;
    setPicked(idx);
    if (idx === cur.correctIndex) setScore((s) => s + 1);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Quiz me · {subject}</DialogTitle>
        </DialogHeader>
        {loading && (
          <div className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Generating 5 MCQs…
          </div>
        )}
        {!loading && !done && cur && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Q {i + 1} / {mcqs.length} · Score {score}</p>
            <p className="font-medium">{cur.question}</p>
            <div className="space-y-2">
              {cur.options.map((opt, idx) => {
                const isRight = idx === cur.correctIndex;
                const isPicked = picked === idx;
                const show = picked !== null;
                return (
                  <button
                    key={idx}
                    onClick={() => choose(idx)}
                    disabled={picked !== null}
                    className={`w-full text-left rounded-lg border p-3 text-sm transition ${
                      show && isRight ? "border-emerald-500 bg-emerald-500/10" :
                      show && isPicked && !isRight ? "border-rose-500 bg-rose-500/10" :
                      "hover:bg-muted"
                    }`}
                  >
                    <span className="font-semibold mr-2">{String.fromCharCode(65 + idx)}.</span>{opt}
                    {show && isRight && <Check className="h-4 w-4 inline ml-2 text-emerald-500" />}
                    {show && isPicked && !isRight && <XIcon className="h-4 w-4 inline ml-2 text-rose-500" />}
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <div className="rounded-lg bg-muted p-3 text-xs">
                <p className={correct ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-rose-600 dark:text-rose-400 font-medium"}>
                  {correct ? "Correct!" : "Not quite."}
                </p>
                <p className="mt-1 text-muted-foreground">{cur.explanation}</p>
                <Button size="sm" className="mt-2 w-full" onClick={next}>
                  {i + 1 >= mcqs.length ? "Finish" : "Next"}
                </Button>
              </div>
            )}
          </div>
        )}
        {done && (
          <div className="text-center space-y-3 py-4">
            <p className="text-2xl font-bold">{score} / {mcqs.length}</p>
            <p className="text-sm text-muted-foreground">+{score} XP added to this week.</p>
            <Button onClick={onClose}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QuizSession;
