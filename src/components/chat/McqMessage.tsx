import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { McqCard, type McqData } from "./McqCard";

export const MCQ_LOADING_SENTINEL = "__MCQ_LOADING__";

interface McqMessageProps {
  content: string;
  messageId: string;
}

/** Try to extract a JSON array of MCQs from the model output. */
function tryParseJson(content: string): McqData[] | null {
  // Strip fences
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates: string[] = [];
  if (fenced) candidates.push(fenced[1]);
  // Find first [...] block
  const arrMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (arrMatch) candidates.push(arrMatch[0]);
  candidates.push(content);

  for (const raw of candidates) {
    try {
      const parsed = JSON.parse(raw.trim());
      if (Array.isArray(parsed)) {
        const mcqs = parsed.map(normalizeMcq).filter(Boolean) as McqData[];
        if (mcqs.length) return mcqs;
      }
    } catch {}
  }
  return null;
}

function normalizeMcq(item: any): McqData | null {
  if (!item || typeof item !== "object") return null;
  const question = String(item.question ?? item.q ?? "").trim();
  let optionsRaw = item.options ?? item.choices;
  const opts: { key: "A" | "B" | "C" | "D"; text: string }[] = [];
  const keys: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];

  if (Array.isArray(optionsRaw)) {
    optionsRaw.slice(0, 4).forEach((o: any, i: number) => {
      const text = typeof o === "string" ? o : String(o?.text ?? o?.label ?? "");
      const cleaned = text.replace(/^[A-D][\).\:\-]\s*/i, "").trim();
      if (cleaned) opts.push({ key: keys[i], text: cleaned });
    });
  } else if (optionsRaw && typeof optionsRaw === "object") {
    keys.forEach((k) => {
      const text = String(optionsRaw[k] ?? optionsRaw[k.toLowerCase()] ?? "").trim();
      if (text) opts.push({ key: k, text });
    });
  }

  if (!question || opts.length < 2) return null;

  let correctRaw = String(item.correct ?? item.answer ?? item.correctAnswer ?? "").trim();
  const m = correctRaw.match(/[A-D]/i);
  const correct = (m ? m[0].toUpperCase() : "A") as "A" | "B" | "C" | "D";

  return {
    question,
    options: opts,
    correct,
    explanation: item.explanation ? String(item.explanation).trim() : undefined,
    topic: item.topic ? String(item.topic).trim() : undefined,
    year: item.year ? String(item.year).trim() : undefined,
  };
}

/** Fallback: parse plain-text MCQ format from the model. */
function tryParseText(content: string): McqData[] | null {
  // Split by question markers like "1.", "Q1.", "Question 1:"
  const blocks = content.split(/\n(?=\s*(?:Q\s*\d+[\.\:\)]|Question\s*\d+[\.\:\)]|\d+[\.\)]\s))/i)
    .map(s => s.trim()).filter(Boolean);

  const mcqs: McqData[] = [];
  for (const block of blocks) {
    const optMatches = [...block.matchAll(/^\s*([A-D])[\).\:\-]\s*(.+)$/gim)];
    if (optMatches.length < 2) continue;

    // Question = text before first option
    const firstOptIdx = block.indexOf(optMatches[0][0]);
    const question = block.slice(0, firstOptIdx)
      .replace(/^\s*(?:Q\s*\d+[\.\:\)]|Question\s*\d+[\.\:\)]|\d+[\.\)])\s*/i, "")
      .trim();
    if (!question) continue;

    const options = optMatches.slice(0, 4).map(m => ({
      key: m[1].toUpperCase() as "A" | "B" | "C" | "D",
      text: m[2].trim().replace(/\s*\*+\s*$/, ""),
    }));

    // Look for answer line
    const ansMatch = block.match(/(?:Answer|Correct(?:\s*Answer)?)\s*[:\-]?\s*\*?\*?\(?\s*([A-D])\)?/i);
    const correct = (ansMatch ? ansMatch[1].toUpperCase() : "A") as "A" | "B" | "C" | "D";

    // Explanation = text after "Explanation:" up to end
    const expMatch = block.match(/Explanation\s*[:\-]\s*([\s\S]+?)(?:\n\s*\n|$)/i);
    const explanation = expMatch ? expMatch[1].trim() : undefined;

    mcqs.push({ question, options, correct, explanation });
  }

  return mcqs.length ? mcqs : null;
}

export const McqMessage = ({ content }: McqMessageProps) => {
  const mcqs = useMemo(() => {
    return tryParseJson(content) ?? tryParseText(content);
  }, [content]);

  if (!mcqs || mcqs.length === 0) {
    // Fallback: show raw text so the user still sees something useful
    return (
      <div className="text-sm whitespace-pre-wrap text-foreground/80">{content}</div>
    );
  }

  return (
    <div className="space-y-3">
      {mcqs.map((mcq, i) => (
        <McqCard key={i} mcq={mcq} index={i} total={mcqs.length} />
      ))}
    </div>
  );
};
