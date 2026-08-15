// The entire question bank is shared with the web app via the `@data` alias
// (see metro.config.js / babel.config.js). Nothing is duplicated here.
import { QUESTION_BANK_DATA } from '@data/questionBankData';

export { QUESTION_BANK_DATA };

export type QuestionType = 'essay' | 'short-notes';

export interface BankNode {
  name?: string;
  questions?: string[];
  subtopics?: Record<string, BankNode>;
  [key: string]: unknown;
}

export type YearKey = 'first-year' | 'second-year' | 'third-year' | 'final-year';

export const YEAR_KEYS: YearKey[] = [
  'first-year',
  'second-year',
  'third-year',
  'final-year',
];

export const YEAR_LABEL: Record<YearKey, string> = {
  'first-year': '1st Year',
  'second-year': '2nd Year',
  'third-year': '3rd Year',
  'final-year': 'Final Year',
};

export const SUBJECT_ICON: Record<string, string> = {
  anatomy: '🫀',
  physiology: '🧠',
  biochemistry: '🧬',
  pharmacology: '💊',
  pathology: '🔬',
  microbiology: '🦠',
  'forensic-medicine': '⚖️',
  'community-medicine': '🏥',
  'general-medicine': '🩺',
  'general-surgery': '🔪',
  'obstetrics-gynaecology': '👶',
  paediatrics: '🧒',
  ent: '👂',
  ophthalmology: '👁️',
};

/** Keys that hold question arrays rather than further topics. */
const LEAF_KEYS = new Set(['essay', 'short-notes', 'short-note']);

export function getYearNode(year: YearKey): BankNode {
  return (QUESTION_BANK_DATA as Record<string, BankNode>)[year];
}

export function getSubjects(year: YearKey) {
  const node = getYearNode(year);
  return Object.entries(node?.subtopics ?? {}).map(([key, value]) => ({
    key,
    name: (value.name as string) ?? key,
    node: value,
  }));
}

/**
 * Walk from a year down a list of subtopic keys. Used by the browse stack,
 * which carries the path in route params so deep screens stay serialisable.
 */
export function resolveNode(year: YearKey, path: string[]): BankNode | undefined {
  let node: BankNode | undefined = getYearNode(year);
  for (const key of path) {
    const subs = node?.subtopics as Record<string, BankNode> | undefined;
    node = subs?.[key];
    if (!node) {
      return undefined;
    }
  }
  return node;
}

/** Question arrays attached directly to this node for the given type. */
export function findTypeQuestions(node: BankNode | undefined, type: QuestionType): string[] {
  if (!node) {
    return [];
  }
  const container = (node.subtopics ?? node) as Record<string, BankNode>;
  if (type === 'essay') {
    const essay = container.essay;
    if (Array.isArray(essay?.questions)) {
      return essay.questions;
    }
    return [];
  }
  for (const key of ['short-notes', 'short-note']) {
    const short = container[key];
    if (Array.isArray(short?.questions)) {
      return short.questions;
    }
  }
  return [];
}

/** Real topic children, excluding the essay / short-notes leaf buckets. */
export function getTopicChildren(node: BankNode | undefined) {
  const subs = (node?.subtopics ?? {}) as Record<string, BankNode>;
  return Object.entries(subs)
    .filter(([key]) => !LEAF_KEYS.has(key))
    .map(([key, value]) => ({ key, name: (value.name as string) ?? key, node: value }));
}

/**
 * Memo tables for the recursive walks below.
 *
 * These walks are pure — the question bank is a frozen TypeScript literal that
 * never changes at runtime — but they were being re-run constantly. Home,
 * Browse and My Progress each map over every subject calling
 * collectAllQuestions, inside a useMemo keyed on the progress store's version.
 * That version bumps on *every* ticked question, so marking one question done
 * re-walked ~5,500 questions across 14 subjects, three times over, allocating
 * a fresh array and Set each time. On a low-end phone that is a visible stall
 * between the tap and the checkbox filling in.
 *
 * A WeakMap keyed on the node object collapses all of that to one walk per
 * node for the life of the process. WeakMap rather than Map so nothing pins
 * the bank in memory if it is ever loaded dynamically.
 *
 * The returned arrays are shared, so treat them as read-only. Every caller
 * either counts them or spreads them into a new array.
 */
const essayCache = new WeakMap<object, string[]>();
const shortNotesCache = new WeakMap<object, string[]>();
const allCache = new WeakMap<object, string[]>();

const EMPTY: string[] = [];

/**
 * Every question string under a node for one type. Mirrors
 * src/lib/question-progress.ts:collectQuestions so counts match the web app.
 *
 * Result is cached per node — see the note above. Do not mutate what you get
 * back.
 */
export function collectQuestions(node: unknown, type: QuestionType): string[] {
  if (!node || typeof node !== 'object') {
    return EMPTY;
  }
  const cache = type === 'essay' ? essayCache : shortNotesCache;
  const cached = cache.get(node as object);
  if (cached) {
    return cached;
  }
  const computed = walkQuestions(node, type);
  cache.set(node as object, computed);
  return computed;
}

function walkQuestions(node: unknown, type: QuestionType): string[] {
  if (!node || typeof node !== 'object') {
    return EMPTY;
  }
  const record = node as Record<string, unknown>;
  if (Array.isArray(record.questions)) {
    return record.questions as string[];
  }
  if (record.subtopics && typeof record.subtopics === 'object') {
    return collectQuestions(record.subtopics, type);
  }
  const out: string[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (key === 'name') {
      continue;
    }
    if (type === 'essay') {
      if (key === 'essay') {
        out.push(...collectQuestions(value, type));
      } else if (key !== 'short-note' && key !== 'short-notes') {
        out.push(...collectQuestions(value, type));
      }
    } else {
      if (key === 'short-note' || key === 'short-notes') {
        out.push(...collectQuestions(value, type));
      } else if (key !== 'essay') {
        out.push(...collectQuestions(value, type));
      }
    }
  }
  return out;
}

/** Both types, de-duplicated. Cached per node; do not mutate the result. */
export function collectAllQuestions(node: unknown): string[] {
  if (!node || typeof node !== 'object') {
    return EMPTY;
  }
  const cached = allCache.get(node as object);
  if (cached) {
    return cached;
  }
  const computed = Array.from(
    new Set([...collectQuestions(node, 'essay'), ...collectQuestions(node, 'short-notes')]),
  );
  allCache.set(node as object, computed);
  return computed;
}

export function countQuestions(node: unknown, type: QuestionType): number {
  return collectQuestions(node, type).length;
}

export interface SearchHit {
  question: string;
  year: YearKey;
  yearLabel: string;
  subjectKey: string;
  subjectName: string;
  type: QuestionType;
}

/**
 * Flat search index, built once on the first search.
 *
 * The previous version re-walked all four years on every keystroke and called
 * .toLowerCase() on ~11,000 question strings each time. Lowercasing once and
 * keeping the result is the whole optimisation: subsequent searches are a
 * linear scan over strings that are already folded.
 *
 * It is built lazily rather than at import time so it never delays app start —
 * the cost lands on the first search, behind the search box's debounce, on a
 * screen the user has just opened.
 */
interface IndexEntry extends SearchHit {
  haystack: string;
}

let searchIndex: IndexEntry[] | null = null;

function buildSearchIndex(): IndexEntry[] {
  const entries: IndexEntry[] = [];
  for (const year of YEAR_KEYS) {
    const yearLabel = YEAR_LABEL[year];
    for (const subject of getSubjects(year)) {
      for (const type of ['essay', 'short-notes'] as QuestionType[]) {
        for (const question of collectQuestions(subject.node, type)) {
          entries.push({
            question,
            haystack: question.toLowerCase(),
            year,
            yearLabel,
            subjectKey: subject.key,
            subjectName: subject.name,
            type,
          });
        }
      }
    }
  }
  return entries;
}

/** Search the whole bank for questions containing `query`. */
export function searchQuestions(query: string, limit = 60): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) {
    return [];
  }
  if (!searchIndex) {
    searchIndex = buildSearchIndex();
  }
  const hits: SearchHit[] = [];
  for (const entry of searchIndex) {
    if (entry.haystack.includes(needle)) {
      hits.push(entry);
      if (hits.length >= limit) {
        break;
      }
    }
  }
  return hits;
}

/**
 * Warm the search index off the critical path. Called when the browse screen
 * mounts, so the first keystroke does not pay for the build.
 */
export function warmSearchIndex(): void {
  if (!searchIndex) {
    searchIndex = buildSearchIndex();
  }
}
