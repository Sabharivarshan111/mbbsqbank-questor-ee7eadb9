// High-yield question intent detection & ranking.
// Pulls ranked essays/short-notes directly from QUESTION_BANK_DATA by asterisk count.
// 100% client-side. No edge function calls. No question-bank data is mutated.
// Typo-tolerant subject matching and loose paper-wording support.

import { QUESTION_BANK_DATA } from "@/data/questionBankData";
import { normalizeString } from "@/lib/utils";

type QType = "essay" | "short-notes";

export interface HighYieldIntent {
  subjectKey: string;
  subjectName: string;
  paperKey?: string;
  paperName?: string;
  subtopicQuery?: string;
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

// ───────────────────────────── Helpers ─────────────────────────────

function tokens(s: string): string[] {
  return normalizeString(s).split(/\s+/).filter(Boolean);
}

// Levenshtein edit distance
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp: number[] = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) dp[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[b.length];
}

// Returns true if token loosely matches target (allows small typos).
function fuzzyTokenMatch(token: string, target: string): boolean {
  if (!token || !target) return false;
  if (token === target) return true;
  if (target.includes(token) && token.length >= 4) return true;
  if (token.includes(target) && target.length >= 4) return true;
  const maxLen = Math.max(token.length, target.length);
  if (maxLen < 4) return false;
  const tolerance = maxLen <= 5 ? 1 : maxLen <= 8 ? 2 : 3;
  return editDistance(token, target) <= tolerance;
}

// ───────────────────────────── Intent detection ─────────────────────────────

const TRIGGER_RE = /\b(important|high[\s-]?yield|most[\s-]?repeated|repeated|frequently[\s-]?asked|commonly[\s-]?asked|exam|tomorrow|top\s+\d+|tell\s+(?:me\s+)?(?:the\s+)?(?:some\s+)?(?:important\s+)?question|give\s+(?:me\s+)?(?:the\s+)?(?:some\s+)?(?:important\s+)?question|list\s+(?:me\s+)?(?:the\s+)?(?:some\s+)?(?:important\s+)?question|show\s+(?:me\s+)?(?:important\s+)?question|need\s+question|want\s+question|essay|short[\s-]?note)\b/i;

const NUMBER_WORDS: Record<string, number> = {
  five: 5, ten: 10, fifteen: 15, twenty: 20, thirty: 30,
};

function parseNumberToken(token: string): number | undefined {
  const n = parseInt(token, 10);
  if (!isNaN(n) && n > 0 && n < 200) return n;
  return NUMBER_WORDS[token.toLowerCase()];
}

function detectLimits(prompt: string): Partial<Record<QType, number>> {
  const out: Partial<Record<QType, number>> = {};
  const essayMatch = prompt.match(/(?:top\s+)?(\d+|five|ten|fifteen|twenty|thirty)\s+(?:high[\s-]?yield\s+)?(?:important\s+)?essays?\b/i);
  if (essayMatch) { const n = parseNumberToken(essayMatch[1]); if (n) out.essay = n; }
  const snMatch = prompt.match(/(?:top\s+)?(\d+|five|ten|fifteen|twenty|thirty)\s+(?:high[\s-]?yield\s+)?(?:important\s+)?short[\s-]?notes?\b/i);
  if (snMatch) { const n = parseNumberToken(snMatch[1]); if (n) out["short-notes"] = n; }
  return out;
}

function detectTypes(prompt: string, limits: Partial<Record<QType, number>>): QType[] {
  const hasEssay = /\bessays?\b/i.test(prompt) || limits.essay !== undefined;
  const hasSN = /\bshort[\s-]?notes?\b/i.test(prompt) || limits["short-notes"] !== undefined;
  if (hasEssay && !hasSN) return ["essay"];
  if (hasSN && !hasEssay) return ["short-notes"];
  return ["essay", "short-notes"];
}

interface SubjectEntry {
  key: string;
  name: string;
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

// Aliases / common misspellings → subject key
const SUBJECT_ALIASES: Array<{ phrases: string[]; key: string }> = [
  { phrases: ["community medicine", "comm med", "comm medicine", "communit medicine", "comunity medicine", "comunit medicine", "comunit", "community med", "psm", "spm", "preventive social medicine", "preventive and social medicine"], key: "community-medicine" },
  { phrases: ["obstetrics gynaecology", "obstetrics gynecology", "obg", "obgyn", "obs gyn", "obs gyne", "gynaec", "gynecology"], key: "obstetrics-gynaecology" },
  { phrases: ["general surgery", "surgery", "gen surgery", "surg"], key: "general-surgery" },
  { phrases: ["general medicine", "medicine", "gen medicine", "gen med", "internal medicine"], key: "general-medicine" },
  { phrases: ["paediatrics", "pediatrics", "paeds", "peds", "pedia", "paed"], key: "paediatrics" },
  { phrases: ["pharmacology", "pharma", "pharmac"], key: "pharmacology" },
  { phrases: ["pathology", "patho", "path"], key: "pathology" },
  { phrases: ["microbiology", "micro", "micrbiology", "microbio"], key: "microbiology" },
  { phrases: ["forensic medicine", "forensic", "fmt", "forensics"], key: "forensic-medicine" },
  { phrases: ["anatomy", "anat"], key: "anatomy" },
  { phrases: ["physiology", "physio"], key: "physiology" },
  { phrases: ["biochemistry", "biochem"], key: "biochemistry" },
  { phrases: ["ent", "otorhinolaryngology", "otorhino"], key: "ent" },
  { phrases: ["ophthalmology", "ophthal", "eye"], key: "ophthalmology" },
  { phrases: ["orthopaedics", "orthopedics", "ortho"], key: "orthopaedics" },
];

function matchSubject(prompt: string): SubjectEntry | null {
  const subjects = listSubjects();
  const lowerN = normalizeString(prompt);
  const ptoks = tokens(prompt);

  // 1. Phrase aliases (longest first) — substring match
  const phraseSorted = SUBJECT_ALIASES
    .flatMap(a => a.phrases.map(p => ({ phrase: p, key: a.key })))
    .sort((a, b) => b.phrase.length - a.phrase.length);
  for (const { phrase, key } of phraseSorted) {
    if (lowerN.includes(phrase)) {
      const hit = subjects.find(s => s.key === key);
      if (hit) return hit;
    }
  }

  // 2. Subject name substring match
  const nameSorted = [...subjects].sort((a, b) => b.name.length - a.name.length);
  for (const s of nameSorted) {
    if (lowerN.includes(normalizeString(s.name))) return s;
  }

  // 3. Fuzzy token-level match against subject names and alias phrases
  let best: { entry: SubjectEntry; score: number } | null = null;
  const candidates: Array<{ key: string; tokens: string[] }> = [];
  for (const s of subjects) candidates.push({ key: s.key, tokens: tokens(s.name) });
  for (const a of SUBJECT_ALIASES) {
    for (const p of a.phrases) candidates.push({ key: a.key, tokens: tokens(p) });
  }

  for (const c of candidates) {
    if (!c.tokens.length) continue;
    // Count how many candidate tokens fuzzy-match some prompt token
    let matched = 0;
    for (const ct of c.tokens) {
      if (ct.length < 3) continue;
      if (ptoks.some(pt => fuzzyTokenMatch(pt, ct))) matched++;
    }
    const significantTokens = c.tokens.filter(t => t.length >= 3).length || 1;
    if (matched >= significantTokens) {
      const score = matched * 10 + significantTokens;
      if (!best || score > best.score) {
        const hit = subjects.find(s => s.key === c.key);
        if (hit) best = { entry: h