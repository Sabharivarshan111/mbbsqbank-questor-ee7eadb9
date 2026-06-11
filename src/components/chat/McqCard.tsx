import { useState } from "react";
import { cn } from "@/lib/utils";

export interface McqData {
  topic?: string;
  question: string;
  options: { key: "A" | "B" | "C" | "D"; text: string }[];
  correct: "A" | "B" | "C" | "D";
  explanation?: string;
  year?: string;
}

interface McqCardProps {
  mcq: McqData;
  index: number;
  total: number;
}

export const McqCard = ({ mcq, index, total }: McqCardProps) => {
  const [selected, setSelected] = useState<"A" | "B" | "C" | "D" | null>(null);
  const answered = selected !== null;

  const handleSelect = (key: "A" | "B" | "C" | "D") => {
    if (answered) return;
    setSelected(key);
  };

  return (
    <div className="rounded-2xl bg-card/60 border border-border/60 p-3 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 text-xs">
        <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary font-semibold tracking-wide">
          MCQ
        </span>
        {mcq.year && <span className="text-muted-foreground">{mcq.year}</span>}
        {mcq.topic && <span className="text-muted-foreground truncate">{mcq.topic}</span>}
        <span className="ml-auto text-muted-foreground">{index + 1} / {total}</span>
      </div>

      {/* Question */}
      <p className="text-sm font-semibold text-foreground mb-3 leading-snug">
        {mcq.question}
      </p>

      {/* Options */}
      <div className="space-y-2">
        {mcq.options.map((opt) => {
          const isSelected = selected === opt.key;
          const isCorrect = opt.key === mcq.correct;
          const showCorrect = answered && isCorrect;
          const showWrong = answered && isSelected && !isCorrect;

          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => handleSelect(opt.key)}
              disabled={answered}
              className={cn(
                "w-full flex items-center gap-3 rounded-full px-3 py-2.5 text-left text-sm transition-all",
                "bg-muted/40 border border-transparent",
                !answered && "hover:bg-muted/60 active:scale-[0.99] cursor-pointer",
                showCorrect && "bg-green-500/10 border-green-500 ring-1 ring-green-500/60",
                showWrong && "bg-red-500/10 border-red-500 ring-1 ring-red-500/60",
              )}
            >
              <span
                className={cn(
                  "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                  "bg-muted text-muted-foreground",
                  showCorrect && "bg-green-500/30 text-green-300",
                  showWrong && "bg-red-500/30 text-red-300",
                )}
              >
                {opt.key}
              </span>
              <span className={cn(
                "text-foreground/90 leading-tight",
                showCorrect && "text-green-200 font-medium",
                showWrong && "text-red-200 font-medium",
              )}>
                {opt.text}
              </span>
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {answered && mcq.explanation && (
        <div className="mt-3 rounded-lg bg-muted/30 border border-border/40 p-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Explanation
          </p>
          <p className="text-xs text-foreground/85 leading-relaxed whitespace-pre-wrap">
            {mcq.explanation}
          </p>
        </div>
      )}
    </div>
  );
};
