// High-yield question intent detection & ranking.
// Pulls ranked essays/short-notes directly from QUESTION_BANK_DATA by asterisk count.
// 100% client-side. No edge function calls. No question-bank data is mutated.

import { QUESTION_BANK_DATA } from "@/data/questionBankData";
import { normalizeString } from "@/lib/utils";

type QType = "essay" | "short-notes";

export interface HighYieldIntent {
  subjectKey: string;
  subjectName: string;
  paperKey?: string;
  paperName?: string;
  subtopicQuery?: string; // raw user-typed subtopic
  types: QType[];
  limits: { essay: number; "short-notes": number };
}

interface RankedQuestion {
  text: string;
  count: number;
}

interface RankedGroup {
  subtopicName: string;
  essays: RankedQuestion[];
  shortNotes: RankedQuestion[];
}

const DEFAULT_LIMITS = { essay: 10, "short-notes": 20 } as const;

// ───────────────────────────── Intent detection ─────────────────────────────

const TRIGGER_RE = /\b(important|high[\s-]?yield|most[\s-]?repeated|repeated|frequently[\s-]?asked|commonly[\s-]?asked|exam tomorrow|tomorrow.*exam|top\s+\d+)\b/i;

const NUMBER_WORDS: Record<string, number> = {
  five: 5, ten: 10, fifteen: 15, twenty: 20, thirty: 30,
};

function parseNumberToken(token: string): number | undefined {
  const n = parseInt(token, 10);
  if (!isNaN(n) && n > 0 && n < 200) return n;
  const w = NUMBER_WORDS[token.toLowerCase()];
  return w;
}

function detectLimits(prompt: string): Partial<Record<QType, number>> {
  const out: Partial<Record<QType, number>> = {};
  // "5 essays", "top 10 essay", "ten essays"
  const essayMatch = prompt.match(/(?:top\s+)?(\d+|five|ten|fifteen|twenty|thirty)\s+(?:high[\s-]?yield\s+)?(?:important\s+)?essays?\b/i);
  if (essayMatch) {
    const n = parseNumberToken(essayMatch[1]);
    if (n) out.essay = n;
  }
  const snMatch = prompt.match(/(?:top\s+)?(\d+|five|ten|fifteen|twenty|thirty)\s+(?:high[\s-]?yield\s+)?(?:important\s+)?short[\s-]?notes?\b/i);
  if (snMatch) {
    const n = parseNumberToken(snMatch[1]);
    if (n) out["short-notes"] = n;
  }
  return out;
}

function detectTypes(prompt: string, limits: Partial<Record<QType, number>>): QType[] {
  const hasEssay = /\bessays?\b/i.test(prompt) || limits.essay !== undefined;
  const hasSN = /\bshort[\s-]?notes?\b/i.test(prompt) || limits["short-notes"] !== undefined;
  if (hasEssay && !hasSN) return ["essay"];
  if (hasSN && !hasEssay) return ["short-notes"];
  return ["essay", "short-notes"];
}

// Flatten QUESTION_BANK_DATA → list of subjects (e.g. Community Medicine)
interface SubjectEntry {
  key: string;            // e.g. "community-medicine"
  name: string;           // e.g. "Community Medicine"
  node: any;
}

function listSubjects(): SubjectEntry[] {
  const out: SubjectEntry[] = [];
  for (const year of Object.values(QUESTION_BANK_DATA) as any[]) {
    if (!year?.subtopics) continue;
    for (const [key, node] of Object.entries(year.subtopics) as [string, any][]) {
      out.push({ key, name: node?.name ?? key, node });
    }
  }
  return out;
}

function matchSubject(prompt: string): SubjectEntry | null {
  const lower = " " + normalizeString(prompt) + " ";
  const subjects = listSubjects();
  // Sort longest-name first so "community medicine" wins over "medicine"
  const sorted = [...subjects].sort((a, b) => b.name.length - a.name.length);
  for (const s of sorted) {
    const nameN = normalizeString(s.name);
    const keyN = normalizeString(s.key);
    if (lower.includes(" " + nameN + " ") || lower.includes(" " + keyN + " ")) return s;
  }
  // Fallback aliases
  const aliases: Record<string, string> = {
    "comm med": "community-medicine",
    "psm": "community-medicine",
    "obg": "obstetrics-gynaecology",
    "obs gyn": "obstetrics-gynaecology",
    "surgery": "general-surgery",
    "medicine": "general-medicine",
    "paeds": "paediatrics",
    "peds": "paediatrics",
    "pharma": "pharmacology",
    "patho": "pathology",
    "micro": "microbiology",
    "forensic": "forensic-medicine",
    "fmt": "forensic-medicine",
  };
  for (const [alias, key] of Object.entries(aliases)) {
    if (lower.includes(" " + alias + " ")) {
      const hit = subjects.find(s => s.key === key);
      if (hit) return hit;
    }
  }
  return null;
}

function detectPaper(prompt: string, subject: SubjectEntry): { key: string; name: string } | null {
  if (!subject.node?.subtopics) return null;
  const papers = Object.entries(subject.node.subtopics)
    .filter(([k]) => /^paper-\d+$/.test(k)) as [string, any][];
  if (papers.length === 0) return null;
  const lower = prompt.toLowerCase();
  // Match "paper 1", "paper one", "p1", "paper-1"
  const m = lower.match(/paper[\s-]*(\d+|one|two|three|1st|2nd|3rd)/);
  let n: number | null = null;
  if (m) {
    const t = m[1];
    if (/^\d+$/.test(t)) n = parseInt(t, 10);
    else if (t === "one" || t === "1st") n = 1;
    else if (t === "two" || t === "2nd") n = 2;
    else if (t === "three" || t === "3rd") n = 3;
  } else {
    const m2 = lower.match(/\bp([123])\b/);
    if (m2) n = parseInt(m2[1], 10);
  }
  if (n === null) return null;
  const key = `paper-${n}`;
  const node = subject.node.subtopics[key];
  if (!node) return null;
  return { key, name: node.name ?? key };
}

function extractSubtopicQuery(prompt: string, subject: SubjectEntry, paperKey?: string): string | undefined {
  // Strip subject/paper/trigger words and types/limits, keep the rest as a subtopic hint.
  let s = " " + prompt.toLowerCase() + " ";
  s = s.replace(new RegExp(normalizeString(subject.name).replace(/\s+/g, "\\s+"), "g"), " ");
  s = s.replace(/paper[\s-]*(?:\d+|one|two|three|1st|2nd|3rd)/g, " ");
  s = s.replace(/\bp[123]\b/g, " ");
  s = s.replace(/\b(important|high[\s-]?yield|most[\s-]?repeated|repeated|frequently[\s-]?asked|commonly[\s-]?asked|exam tomorrow|tomorrow.*exam)\b/g, " ");
  s = s.replace(/(?:top\s+)?(?:\d+|five|ten|fifteen|twenty|thirty)\s+(?:high[\s-]?yield\s+)?(?:important\s+)?(?:essays?|short[\s-]?notes?)/g, " ");
  s = s.replace(/\b(essays?|short[\s-]?notes?|questions?|topics?|please|can you|give me|tell me|i have|now|read|only|to|for|me|the|a|in|on|of|and|or|with|some|all|list|show|need|want|are|is|kindly|plz|pls|hi|hey|ok|okay)\b/g, " ");
  s = s.replace(/[?,.!:;()\[\]/]/g, " ").replace(/\s+/g, " ").trim();
  return s.length >= 3 ? s : undefined;
}

export function detectHighYieldIntent(prompt: string): HighYieldIntent | null {
  if (!prompt || prompt.length < 4) return null;
  // Need a trigger OR the combination of "(essays|short notes)" with a subject mention
  const trigger = TRIGGER_RE.test(prompt);
  const mentionsType = /\bessays?\b|\bshort[\s-]?notes?\b/i.test(prompt);
  if (!trigger && !mentionsType) return null;

  const subject = matchSubject(prompt);
  if (!subject) return null;

  // Require some intent verb (trigger) OR a clear "essay/short note" type ask
  if (!trigger && !mentionsType) return null;

  const paper = detectPaper(prompt, subject);
  const limits = detectLimits(prompt);
  const types = detectTypes(prompt, limits);
  const subtopicQuery = extractSubtopicQuery(prompt, subject, paper?.key);

  return {
    subjectKey: subject.key,
    subjectName: subject.name,
    paperKey: paper?.key,
    paperName: paper?.name,
    subtopicQuery,
    types,
    limits: {
      essay: limits.essay ?? DEFAULT_LIMITS.essay,
      "short-notes": limits["short-notes"] ?? DEFAULT_LIMITS["short-notes"],
    },
  };
}

// ───────────────────────────── Ranking ─────────────────────────────

function countAsterisks(q: string): number {
  // Pick the LONGEST run of consecutive asterisks anywhere in the string.
  const matches = q.match(/\*+/g);
  if (!matches) return 0;
  return matches.reduce((m, r) => Math.max(m, r.length), 0);
}

function cleanQuestionText(q: string): string {
  return q
    .replace(/\(Pg\.?\s*[Nn]o\.?:?[^)]*\)/g, "")
    .replace(/\[Pg[^\]]*\]/g, "")
    .replace(/\*+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractRanked(arr: unknown): RankedQuestion[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((q: string) => ({ text: cleanQuestionText(q), count: countAsterisks(q) }));
}

// Walk a node and collect (subtopicName → essays + shortNotes) groups.
function walkGroups(node: any, currentName?: string): RankedGroup[] {
  if (!node || typeof node !== "object") return [];
  const out: RankedGroup[] = [];
  const sub = node.subtopics;
  if (!sub || typeof sub !== "object") return out;

  // Is this node itself a leaf subtopic with essay/short-notes?
  const essayNode = sub.essay;
  const snNode = sub["short-notes"] ?? sub["short-note"];
  const hasLeaf = (essayNode && Array.isArray(essayNode.questions)) ||
                  (snNode && Array.isArray(snNode.questions));
  if (hasLeaf) {
    out.push({
      subtopicName: currentName ?? node.name ?? "Topic",
      essays: extractRanked(essayNode?.questions),
      shortNotes: extractRanked(snNode?.questions),
    });
  }

  // Recurse into non-leaf children
  for (const [key, child] of Object.entries(sub)) {
    if (key === "essay" || key === "short-notes" || key === "short-note") continue;
    if (child && typeof child === "object") {
      const childName = (child as any).name ?? key;
      out.push(...walkGroups(child, childName));
    }
  }
  return out;
}

function findStartNode(intent: HighYieldIntent): { node: any; label: string } | null {
  const subjects = listSubjects();
  const subj = subjects.find(s => s.key === intent.subjectKey);
  if (!subj) return null;
  let node = subj.node;
  let label = subj.name;
  if (intent.paperKey && node?.subtopics?.[intent.paperKey]) {
    node = node.subtopics[intent.paperKey];
    label = `${subj.name} – ${node.name ?? intent.paperKey}`;
  }
  // Narrow to subtopic if provided
  if (intent.subtopicQuery) {
    const found = findSubtopicNode(node, intent.subtopicQuery);
    if (found) return { node: found.node, label: `${label} – ${found.name}` };
  }
  return { node, label };
}

function findSubtopicNode(node: any, query: string): { node: any; name: string } | null {
  if (!node?.subtopics) return null;
  const qn = normalizeString(query);
  const qWords = qn.split(/\s+/).filter(w => w.length > 2);

  let best: { node: any; name: string; score: number } | null = null;

  const walk = (n: any) => {
    if (!n?.subtopics) return;
    for (const [key, child] of Object.entries(n.subtopics)) {
      if (key === "essay" || key === "short-notes" || key === "short-note") continue;
      const c = child as any;
      const name = c?.name ?? key;
      const nameN = normalizeString(name);
      const keyN = normalizeString(key);
      let score = 0;
      if (nameN === qn || keyN === qn) score = 100;
      else if (nameN.includes(qn) || qn.includes(nameN) || keyN.includes(qn)) score = 60;
      else {
        // word overlap
        const overlap = qWords.filter(w => nameN.includes(w) || keyN.includes(w)).length;
        if (overlap > 0) score = 20 + overlap * 10;
      }
      if (score > 0 && (!best || score > best.score)) {
        best = { node: c, name, score };
      }
      walk(c);
    }
  };
  walk(node);
  return best ? { node: best.node, name: best.name } : null;
}

export interface HighYieldResult {
  label: string;
  groups: RankedGroup[];
}

export function getRankedQuestions(intent: HighYieldIntent): HighYieldResult | null {
  const start = findStartNode(intent);
  if (!start) return null;
  const groups = walkGroups(start.node, start.node?.name ?? start.label);
  return { label: start.label, groups };
}

// ───────────────────────────── Formatting ─────────────────────────────

function stars(n: number): string {
  if (n <= 0) return "";
  return ` ${"★".repeat(Math.min(n, 6))} (${n})`;
}

export function formatHighYieldResponse(intent: HighYieldIntent, result: HighYieldResult): string {
  // Aggregate across groups; if single group, render headings without subtopic split.
  const wantEssay = intent.types.includes("essay");
  const wantSN = intent.types.includes("short-notes");

  const isSingleSubtopic = result.groups.length === 1;

  let out = `# High-Yield Questions — ${result.label}\n\n`;
  out += `_Ranked by repetition count (★ = times asked in previous exams)._\n\n`;

  if (isSingleSubtopic) {
    const g = result.groups[0];
    if (wantEssay) out += renderList("Most Repeated Essays", g.essays, intent.limits.essay);
    if (wantSN) out += renderList("Most Repeated Short Notes", g.shortNotes, intent.limits["short-notes"]);
  } else {
    // Aggregate all and rank globally, but also keep per-subtopic context.
    const allEssays: RankedQuestion[] = [];
    const allSN: RankedQuestion[] = [];
    for (const g of result.groups) {
      g.essays.forEach(q => allEssays.push({ text: `${q.text}  _(${g.subtopicName})_`, count: q.count }));
      g.shortNotes.forEach(q => allSN.push({ text: `${q.text}  _(${g.subtopicName})_`, count: q.count }));
    }
    if (wantEssay) out += renderList(`Top ${intent.limits.essay} Essays`, allEssays, intent.limits.essay);
    if (wantSN) out += renderList(`Top ${intent.limits["short-notes"]} Short Notes`, allSN, intent.limits["short-notes"]);
  }

  out += `\n---\n_Source: your in-app question bank. Tip: ask "important essays in Community Medicine Paper 2 – Demography" for a sharper list._`;
  return out;
}

function renderList(heading: string, items: RankedQuestion[], limit: number): string {
  let out = `## ${heading}\n\n`;
  if (items.length === 0) {
    out += `_No questions found for this selection._\n\n`;
    return out;
  }
  const sorted = [...items].sort((a, b) => b.count - a.count).slice(0, limit);
  sorted.forEach((q, i) => {
    out += `${i + 1}. ${q.text}${stars(q.count)}\n`;
  });
  out += `\n`;
  return out;
}
