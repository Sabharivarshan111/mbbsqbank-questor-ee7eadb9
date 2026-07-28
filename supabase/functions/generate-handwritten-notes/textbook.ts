// Textbook grounding for handwritten notes.
// Imports OCR text bundles as TS string modules so Supabase Edge Functions
// deploy them deterministically (sibling .txt files are NOT bundled).

import sia1 from "./textbooks/sia_1.text.ts";
import sia2 from "./textbooks/sia_2.text.ts";
import vision0 from "./textbooks/vision_0.text.ts";
import vision1 from "./textbooks/vision_1.text.ts";

type Book = { key: string; paragraphs: string[] };

const STOPWORDS = new Set([
  "the","and","for","with","from","that","this","into","which","what","when",
  "where","their","them","they","have","has","had","are","was","were","been",
  "being","its","it's","itself","about","also","any","all","some","such",
  "not","no","yes","of","in","on","by","to","or","a","an","is","be","as",
  "at","if","so","we","you","your","our","us","i","me","my","he","she",
  "his","her","him","between","among","above","below","under","over","after",
  "before","during","because","while","than","then","these","those","other",
  "define","describe","discuss","write","short","note","essay","brief",
  "types","type","give","explain","classification","classify","enumerate",
  "add","mention","causes","clinical","features","management","treatment",
  "diagnosis","prevention","control","measures","factors","aspects","note.",
  "notes","only","various","how","why",
]);

function splitParagraphs(text: string): string[] {
  if (!text) return [];
  const cleaned = text.replace(/===== PAGE \d+ ?\/? ?\d* =====/g, "\n\n");
  const rawParas = cleaned.split(/\n\s*\n+/);
  const out: string[] = [];
  for (const p of rawParas) {
    const t = p.replace(/\s+/g, " ").trim();
    if (t.length < 60) continue;
    if (t.length <= 900) {
      out.push(t);
    } else {
      for (let i = 0; i < t.length; i += 800) out.push(t.slice(i, i + 900));
    }
  }
  return out;
}

let cache: Record<string, Book> | null = null;
function loadBooks(): Record<string, Book> {
  if (cache) return cache;
  const community = splitParagraphs(sia1 + "\n\n" + sia2);
  const forensic = splitParagraphs(vision0 + "\n\n" + vision1);
  cache = {
    community: { key: "community", paragraphs: community },
    forensic: { key: "forensic", paragraphs: forensic },
  };
  console.log(`[textbook] loaded — community paragraphs=${community.length}, forensic paragraphs=${forensic.length}`);
  return cache;
}

export function pickBookKey(subject: string): "community" | "forensic" | null {
  const s = (subject || "").toLowerCase();
  if (s.includes("community") || s.includes("psm") || s.includes("preventive") || s.includes("social medicine")) return "community";
  if (s.includes("forensic") || s.includes("fmt") || s.includes("toxicology")) return "forensic";
  return null;
}

function tokenize(s: string): string[] {
  // Allow 3-char tokens so terms like "air", "TB", "HIV", "ORS", "DOT", "PSM"
  // (frequent MBBS keywords) survive filtering.
  return (s.toLowerCase().match(/[a-z][a-z0-9\-]{2,}/g) || [])
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

export async function buildTextbookContext(
  subject: string,
  subtopicName: string,
  questions: string[],
  maxChars = 18000,
): Promise<string> {
  const key = pickBookKey(subject);
  if (!key) return "";
  const books = loadBooks();
  const book = books[key];
  if (!book || book.paragraphs.length === 0) return "";

  const subtopicTokens = tokenize(subtopicName);
  const questionTokens = questions.map((q) => tokenize(q));
  const queryTokens = new Set<string>([
    ...subtopicTokens,
    ...questionTokens.flat(),
  ]);
  if (queryTokens.size === 0) return "";

  // Boost tokens = subtopic tokens + first 3 meaningful tokens of each question
  const boostTokens = new Set<string>([
    ...subtopicTokens,
    ...questionTokens.flatMap((toks) => toks.slice(0, 3)),
  ]);

  const nameLower = subtopicName.toLowerCase();
  const scored: Array<{ idx: number; score: number }> = [];
  for (let i = 0; i < book.paragraphs.length; i++) {
    const p = book.paragraphs[i].toLowerCase();
    let score = 0;
    for (const tok of queryTokens) if (p.includes(tok)) score += 1;
    if (score === 0) continue;
    for (const tok of boostTokens) if (p.includes(tok)) score += 1; // second-pass boost
    if (nameLower.length >= 5 && p.includes(nameLower)) score += 6;
    scored.push({ idx: i, score });
  }
  if (scored.length === 0) {
    console.log(`[textbook] no matches for subject=${subject} subtopic=${subtopicName}`);
    return "";
  }
  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);

  const picked: string[] = [];
  let used = 0;
  const seen = new Set<number>();
  for (const s of scored) {
    if (seen.has(s.idx)) continue;
    const para = book.paragraphs[s.idx];
    if (used + para.length + 4 > maxChars) continue;
    picked.push(para);
    seen.add(s.idx);
    used += para.length + 4;
    if (picked.length >= 80) break;
  }
  console.log(`[textbook] subject=${subject} subtopic="${subtopicName}" matched=${scored.length} picked=${picked.length} chars=${used}`);
  return picked.join("\n\n");
}
