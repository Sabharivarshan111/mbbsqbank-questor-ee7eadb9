import { useEffect, useMemo, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { FlaskConical, Sparkles } from "lucide-react";
import type { Year } from "@/lib/year-subjects";
import { getYearSubjects } from "@/lib/year-subjects";
import { collectQuestions, countDone, isQuestionDone, QUESTION_PROGRESS_EVENT } from "@/lib/question-progress";
import QuizSession from "./QuizSession";

interface Props {
  year: Year;
}

const SubjectsList = ({ year }: Props) => {
  const subjects = useMemo(() => getYearSubjects(year), [year]);
  const [tick, setTick] = useState(0);
  const [quizFor, setQuizFor] = useState<{ name: string; questions: string[] } | null>(null);

  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    window.addEventListener(QUESTION_PROGRESS_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(QUESTION_PROGRESS_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return (
    <div className="space-y-3">
      <p className="text-xs tracking-widest text-muted-foreground">SUBJECTS</p>
      {subjects.map((s, i) => {
        const allQs = [
          ...collectQuestions(s.node, "essay"),
          ...collectQuestions(s.node, "short-notes"),
        ];
        const unique = Array.from(new Set(allQs));
        const total = unique.length;
        const done = countDone(unique);
        const pct = total ? Math.round((done / total) * 100) : 0;
        const ticked = unique.filter(isQuestionDone);
        const canQuiz = ticked.length >= 3;
        return (
          <div
            key={s.key + tick}
            className="rounded-xl bg-card border p-3 flex items-center gap-3 animate-fade-in hover:shadow-md hover:border-primary/40 transition-all"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-fuchsia-500/20 to-orange-400/20 text-primary flex items-center justify-center flex-shrink-0">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium truncate">{s.name}</p>
                <span className="text-xs font-semibold bg-gradient-to-r from-fuchsia-500 to-orange-400 bg-clip-text text-transparent">{pct}%</span>
              </div>
              <Progress value={pct} className="h-1.5 mt-1" />
              <p className="text-[11px] text-muted-foreground mt-1">{done} / {total} questions</p>
            </div>
            {canQuiz && (
              <Button
                size="sm"
                variant="outline"
                className="flex-shrink-0 gap-1"
                onClick={() => setQuizFor({ name: s.name, questions: ticked })}
                title="AI quiz me on what I've studied"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Quiz
              </Button>
            )}
          </div>
        );
      })}
      {quizFor && (
        <QuizSession
          open={!!quizFor}
          onClose={() => setQuizFor(null)}
          subject={quizFor.name}
          questions={quizFor.questions}
        />
      )}
    </div>
  );
};

export default SubjectsList;
