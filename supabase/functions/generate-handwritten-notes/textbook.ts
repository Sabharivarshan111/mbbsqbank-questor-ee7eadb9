// Textbook grounding for handwritten notes.
// Loads bundled OCR text files (Sia — Community Medicine, Vision — Forensic Medicine)
// once per cold start and returns the most relevant paragraphs for a given topic +
// list of questions using simple keyword scoring.

type Book = { key: string; text: string; paragraphs: string[] };

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

let cache: Record<string, Book> | null = null;

async function readBundled(rel: string): Promise<string> {
  try {
    // import.meta.url points at this file inside the deployed function.
    const url = new URL(`./textbooks/${rel}`, import.meta.url);
    return await Deno.readTextFile(url);
  } catch (_e) {
    return "";
  }
}

function splitParagraphs(text: string): string[] {
  if (!text) return [];
  // Remove page markers so they don't split too aggressively.
  const cleaned = text.replace(/===== PAGE \d+ ?\/ ?\d+ =====/g, "\n\n");
  const rawParas = cleaned.split(/\n\s*\n+/);
  const out: string[] = [];
  for (const p of rawParas) {
    const t = p.replace(/\s+/g, " ").trim();
    if (t.length < 60) continue;
    // Break very long paragraphs into ~800-char windows so relevance scoring is meaningful.
    if (t.length <= 900) {
      out.push(t);
    } else {
      for (let i = 0; i < t.length; i += 800) {
        out.push(t.slice(i, i + 900));
      }
    }
  }
  return out;
}

async function loadBooks(): Promise<Record<string, Book>> {
  if (cache) return cache;
  const files: Array<{ key: string; file: string }> = [
    { key: "community", file: "sia_1.txt" },
    { key: "community", file: "sia_2.txt" },
    { key: "forensic",  file: "vision.txt" },
  ];
  const grouped: Record<string, string[]> = {};
  for (const f of files) {
    const txt = await readBundled(f.file);
    if (!txt) continue;
    (grouped[f.key] ||= []).push(txt);
  }
  const books: Record<string, Book> = {};
  for (const [key, parts] of Object.entries(grouped)) {
    const text = parts.join("\n\n");
    books[key] = { key, text, paragraphs: splitParagraphs(text) };
  }
  cache = books;
  return books;
}

export function pickBookKey(subject: string): "community" | "forensic" | null {
  const s = (subject || "").toLowerCase();
  if (s.includes("community") || s.includes("psm") || s.includes("preventive") || s.includes("social medicine")) return "community";
  if (s.includes("forensic") || s.includes("fmt") || s.includes("toxicology")) return "forensic";
  return null;
}

function tokenize(s: string): string[] {
  return (s.toLowerCase().match(/[a-z][a-z0-9\-]{2,}/g) || [])
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

export async function buildTextbookContext(
  subject: string,
  subtopicName: string,
  questions: string[],
  maxChars = 12000,
): Promise<string> {
  const key = pickBookKey(subject);
  if (!key) return "";
  const books = await loadBooks();
  const book = books[key];
  if (!book || book.paragraphs.length === 0) return "";

  const queryTokens = new Set<string>([
    ...tokenize(subtopicName),
    ...questions.flatMap((q) => tokenize(q)),
  ]);
  if (queryTokens.size === 0) return "";

  // Score paragraphs: sum of unique token hits + a small boost when the exact
  // subtopic name appears.
  const nameLower = subtopicName.toLowerCase();
  const scored: Array<{ idx: number; score: number }> = [];
  for (let i = 0; i < book.paragraphs.length; i++) {
    const p = book.paragraphs[i].toLowerCase();
    let score = 0;
    for (const tok of queryTokens) {
      if (p.includes(tok)) score += 1;
    }
    if (score === 0) continue;
    if (nameLower.length >= 5 && p.includes(nameLower)) score += 4;
    scored.push({ idx: i, score });
  }
  if (scored.length === 0) return "";
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
    if (picked.length >= 40) break;
  }
  return picked.join("\n\n");
}
