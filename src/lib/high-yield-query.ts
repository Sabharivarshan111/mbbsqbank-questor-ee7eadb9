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

const TRIGGER_RE = /\b(important|high[\s-]?yield|most[\s-]?repeated|repeated|frequently[\s-]?asked|commonly[\s-]?asked|exam|tomorrow|top\s+\d+|tell|give|list|show|need|want|essays?|short[\s-]?notes?|questions?)\b/i;

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

const SUBJECT_ALIASES: Array<{ phrases: string[]; key: string }> = [
  { phrases: ["community medicine", "comm med", "comm medicine", "communit medicine", "comunity medicine", "comunit medicine", "community med", "psm", "spm", "preventive social medicine", "preventive and social medicine"], key: "community-medicine" },
  { phrases: ["obstetrics gynaecology", "obstetrics gynecology", "obg", "obgyn", "obs gyn", "obs gyne", "gynaec", "gynecology", "obstetrics"], key: "obstetrics-gynaecology" },
  { phrases: ["general surgery", "surgery", "gen surgery", "surg"], key: "general-surgery" },
  { phrases: ["general medicine", "gen medicine", "gen med", "internal medicine"], key: "general-medicine" },
  { phrases: ["paediatrics", "pediatrics", "paeds", "peds", "pedia", "paed"], key: "paediatrics" },
  { phrases: ["pharmacology", "pharma", "pharmac"], key: "pharmacology" },
  { phrases: ["pathology", "patho"], key: "pathology" },
  { phrases: ["microbiology", "micro", "microbio"], key: "microbiology" },
  { phrases: ["forensic medicine", "forensic", "fmt", "forensics"], key: "forensic-medicine" },
  { phrases: ["anatomy", "anat"], key: "anatomy" },
  { phrases: ["physiology", "physio"], key: "physiology" },
  { phrases: ["biochemistry", "biochem"], key: "biochemistry" },
  { phrases: ["ent", "otorhinolaryngology"], key: "ent" },
  { phrases: ["ophthalmology", "ophthal"], key: "ophthalmology" },
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

  // 2. Subject name substring
  const nameSorted = [...subjects].sort((a, b) => b.name.length - a.name.length);
  for (const s of nameSorted) {
    if (lowerN.includes(normalizeString(s.name))) return s;
  }

  // 3. Strict fuzzy token match against multi-word alias phrases / subject names only.
  // Single-token aliases (e.g. "ent", "ortho", "psm") are intentionally excluded here
  // to avoid words like "disaster" fuzzy-mapping onto unrelated short subject codes.
  let best: { entry: SubjectEntry; score: number } | null = null;
  const candidates: Array<{ key: string; tokens: string[] }> = [];
  for (const s of subjects) {
    const t = tokens(s.name).filter(x => x.length >= 3);
    if (t.length >= 2) candidates.push({ key: s.key, tokens: t });
  }
  for (const a of SUBJECT_ALIASES) {
    for (const p of a.phrases) {
      const t = tokens(p).filter(x => x.length >= 3);
      if (t.length >= 2) candidates.push({ key: a.key, tokens: t });
    }
  }

  for (const c of candidates) {
    const sigTokens = c.tokens;
    let matched = 0;
    for (const ct of sigTokens) {
      if (ptoks.some(pt => fuzzyTokenMatch(pt, ct))) matched++;
    }
    if (matched === sigTokens.length && matched >= 2) {
      const score = matched * 10 + sigTokens.length;
      if (!best || score > best.score) {
        const hit = subjects.find(s => s.key === c.key);
        if (hit) best = { entry: hit, score };
      }
    }
  }
  return best ? best.entry : null;
}

// Clean filler/trigger words from a prompt without removing subject names.
// Used for global subtopic search when no subject is mentioned.
function cleanForSubtopicSearch(prompt: string): string {
  let s = " " + prompt.toLowerCase() + " ";
  s = s.replace(/paper[\s-]*(?:\d+|one|two|three|to|too|tu|tree|1st|2nd|3rd|first|second|third)/g, " ");
  s = s.replace(/\b(?:\d+|one|two|three|1st|2nd|3rd|first|second|third)\s*(?:nd|st|rd|th)?\s+paper\b/g, " ");
  s = s.replace(/\bp\s*[123]\b/g, " ");
  s = s.replace(/\b(important|high[\s-]?yield|most[\s-]?repeated|repeated|frequently[\s-]?asked|commonly[\s-]?asked|exam tomorrow|tomorrow.*?exam|tomorrow|exam)\b/g, " ");
  s = s.replace(/(?:top\s+)?(?:\d+|five|ten|fifteen|twenty|thirty)\s+(?:high[\s-]?yield\s+)?(?:important\s+)?(?:essays?|short[\s-]?notes?)/g, " ");
  s = s.replace(/\b(essays?|short[\s-]?notes?|questions?|topics?|please|can you|tell|give|show|list|need|want|me|the|a|an|in|on|of|and|or|with|some|all|now|for|to|read|only|i|have|kindly|plz|pls|hi|hey|ok|okay|are|is|will|would|could|my|about|regarding)\b/g, " ");
  s = s.replace(/[?,.!:;()\[\]/]/g, " ").replace(/\s+/g, " ").trim();
  return s;
}

// Search every subject's subtopic tree and return the best matching subject + subtopic node.
function findSubtopicAcrossAllSubjects(query: string): { subject: SubjectEntry; paperKey?: string; subtopicName: string; score: number } | null {
  if (!query || query.length < 3) return null;
  const subjects = listSubjects();
  let best: { subject: SubjectEntry; paperKey?: string; subtopicName: string; score: number } | null = null;

  for (const subj of subjects) {
    // Try the subject root.
    const rootMatch = findSubtopicNode(subj.node, query);
    if (rootMatch && rootMatch.score >= 40) {
      if (!best || rootMatch.score > best.score) {
        best = { subject: subj, subtopicName: rootMatch.name, score: rootMatch.score };
      }
    }
    // Also try each paper node so we can capture paperKey context.
    const subs = subj.node?.subtopics;
    if (subs) {
      for (const [k, child] of Object.entries(subs)) {
        if (!/^paper-\d+$/.test(k)) continue;
        const m = findSubtopicNode(child, query);
        if (m && m.score >= 40) {
          // Prefer matches with a containing name (tie-break).
          const score = m.score + 1;
          if (!best || score > best.score) {
            best = { subject: subj, paperKey: k, subtopicName: m.name, score };
          }
        }
      }
    }
  }
  return best;
}

function detectPaper(prompt: string, subject: SubjectEntry): { key: string; name: string } | null {
  if (!subject.node?.subtopics) return null;
  const papers = Object.entries(subject.node.subtopics)
    .filter(([k]) => /^paper-\d+$/.test(k)) as [string, any][];
  if (papers.length === 0) return null;
  const lower = " " + prompt.toLowerCase() + " ";

  // Word→number map (incl. common typos: "to"→2, "too"→2, "tree"→3)
  const wordNum: Record<string, number> = {
    one: 1, two: 2, three: 3, "1st": 1, "2nd": 2, "3rd": 3,
    first: 1, second: 2, third: 3,
    to: 2, too: 2, tu: 2, tree: 3,
  };

  // 1. "paper 2" / "paper-2" / "paper two" / "paper to"
  let m = lower.match(/paper[\s-]*(\d+|one|two|three|to|too|tu|tree|1st|2nd|3rd|first|second|third)\b/);
  let n: number | null = null;
  if (m) {
    const t = m[1];
    if (/^\d+$/.test(t)) n = parseInt(t, 10);
    else n = wordNum[t] ?? null;
  }
  // 2. "2nd paper" / "second paper" / "two paper"
  if (n === null) {
    const m2 = lower.match(/\b(\d+|one|two|three|1st|2nd|3rd|first|second|third)\s*(?:nd|st|rd|th)?\s+paper\b/);
    if (m2) {
      const t = m2[1];
      if (/^\d+$/.test(t)) n = parseInt(t, 10);
      else n = wordNum[t] ?? null;
    }
  }
  // 3. "p1" / "p2" / "p 2"
  if (n === null) {
    const m3 = lower.match(/\bp\s*([123])\b/);
    if (m3) n = parseInt(m3[1], 10);
  }
  if (n === null) return null;
  const key = `paper-${n}`;
  const node = subject.node.subtopics[key];
  if (!node) return null;
  return { key, name: node.name ?? key };
}

function extractSubtopicQuery(prompt: string, subject: SubjectEntry): string | undefined {
  let s = " " + prompt.toLowerCase() + " ";
  // Strip subject name and alias phrases
  const stripPhrases = [
    normalizeString(subject.name),
    ...(SUBJECT_ALIASES.find(a => a.key === subject.key)?.phrases ?? []),
  ];
  for (const p of stripPhrases) {
    if (!p) continue;
    s = s.replace(new RegExp(p.replace(/\s+/g, "\\s+"), "g"), " ");
  }
  // Strip paper variants
  s = s.replace(/paper[\s-]*(?:\d+|one|two|three|to|too|tu|tree|1st|2nd|3rd|first|second|third)/g, " ");
  s = s.replace(/\b(?:\d+|one|two|three|1st|2nd|3rd|first|second|third)\s*(?:nd|st|rd|th)?\s+paper\b/g, " ");
  s = s.replace(/\bp\s*[123]\b/g, " ");
  // Strip triggers / filler
  s = s.replace(/\b(important|high[\s-]?yield|most[\s-]?repeated|repeated|frequently[\s-]?asked|commonly[\s-]?asked|exam tomorrow|tomorrow.*?exam|tomorrow|exam)\b/g, " ");
  s = s.replace(/(?:top\s+)?(?:\d+|five|ten|fifteen|twenty|thirty)\s+(?:high[\s-]?yield\s+)?(?:important\s+)?(?:essays?|short[\s-]?notes?)/g, " ");
  s = s.replace(/\b(essays?|short[\s-]?notes?|questions?|topics?|please|can you|tell|give|show|list|need|want|me|the|a|an|in|on|of|and|or|with|some|all|now|for|to|read|only|i|have|kindly|plz|pls|hi|hey|ok|okay|are|is|will|would|could|my)\b/g, " ");
  s = s.replace(/[?,.!:;()\[\]/]/g, " ").replace(/\s+/g, " ").trim();
  return s.length >= 3 ? s : undefined;
}

export function detectHighYieldIntent(prompt: string): HighYieldIntent | null {
  if (!prompt || prompt.length < 3) return null;
  // Skip if this is a triple-tap / double-tap special prompt
  if (/^(triple-tapped:|double-tapped:)/i.test(prompt.trim())) return null;
  if (!TRIGGER_RE.test(prompt)) return null;

  const limits = detectLimits(prompt);
  const types = detectTypes(prompt, limits);

  let subject = matchSubject(prompt);
  let paper = subject ? detectPaper(prompt, subject) : null;
  let subtopicQuery: string | undefined;

  if (subject) {
    subtopicQuery = extractSubtopicQuery(prompt, subject);
  } else {
    // No subject named — try to identify a subtopic across all subjects.
    const cleaned = cleanForSubtopicSearch(prompt);
    const hit = cleaned ? findSubtopicAcrossAllSubjects(cleaned) : null;
    if (!hit) return null;
    subject = hit.subject;
    if (hit.paperKey) {
      const node = subject.node?.subtopics?.[hit.paperKey];
      paper = node ? { key: hit.paperKey, name: node.name ?? hit.paperKey } : null;
    }
    subtopicQuery = cleaned;
  }

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
  // Match UI logic in QuestionCard: sum all star-like chars anywhere.
  const starMatches = q.match(/[\*★☆⭐]/g);
  if (starMatches && starMatches.length > 0) return starMatches.length;

  // Fallback: count exam-date entries in (Jan 23, Jun 24; ...) style
  const datePattern = /\(((?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{2,4}[,;]?\s*)+)\)/i;
  const dateMatch = q.match(datePattern);
  if (dateMatch && dateMatch[1]) {
    return dateMatch[1].split(/[;,]/).map(s => s.trim()).filter(Boolean).length;
  }
  return 0;
}

function cleanQuestionText(q: string): string {
  return q
    .replace(/\(Pg\.?\s*[Nn]o\.?:?[^)]*\)/g, "")
    .replace(/\[Pg[^\]]*\]/g, "")
    .replace(/[\*★☆⭐]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractRanked(arr: unknown): RankedQuestion[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((q: string) => ({ text: cleanQuestionText(q), count: countAsterisks(q) }));
}

function walkGroups(node: any, currentName?: string): RankedGroup[] {
  if (!node || typeof node !== "object") return [];
  const out: RankedGroup[] = [];
  const sub = node.subtopics;
  if (!sub || typeof sub !== "object") {
    // node may itself carry essay/short-notes directly
    const essayNode = node.essay;
    const snNode = node["short-notes"] ?? node["short-note"];
    if ((essayNode && Array.isArray(essayNode.questions)) || (snNode && Array.isArray(snNode.questions))) {
      out.push({
        subtopicName: currentName ?? node.name ?? "Topic",
        essays: extractRanked(essayNode?.questions),
        shortNotes: extractRanked(snNode?.questions),
      });
    }
    return out;
  }

  // Some nodes store essay/short-notes inside .subtopics, others as direct props.
  const essayNode = sub.essay ?? node.essay;
  const snNode = sub["short-notes"] ?? sub["short-note"] ?? node["short-notes"] ?? node["short-note"];
  const hasLeaf = (essayNode && Array.isArray(essayNode.questions)) ||
                  (snNode && Array.isArray(snNode.questions));
  if (hasLeaf) {
    out.push({
      subtopicName: currentName ?? node.name ?? "Topic",
      essays: extractRanked(essayNode?.questions),
      shortNotes: extractRanked(snNode?.questions),
    });
  }

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
  if (intent.subtopicQuery) {
    const found = findSubtopicNode(node, intent.subtopicQuery);
    if (found && found.score >= 40) return { node: found.node, label: `${label} – ${found.name}` };
  }
  return { node, label };
}

function findSubtopicNode(node: any, query: string): { node: any; name: string; score: number } | null {
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
        const overlap = qWords.filter(w =>
          nameN.includes(w) || keyN.includes(w) ||
          tokens(nameN).some(t => fuzzyTokenMatch(w, t))
        ).length;
        if (overlap > 0) score = 20 + overlap * 10;
      }
      if (score > 0 && (!best || score > best.score)) {
        best = { node: c, name, score };
      }
      walk(c);
    }
  };
  walk(node);
  return best;
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
  return ` ★${"★".repeat(Math.min(n, 6) - 1)} (${n})`;
}

export function formatHighYieldResponse(intent: HighYieldIntent, result: HighYieldResult): string {
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
