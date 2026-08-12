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
 * Every question string under a node for one type. Mirrors
 * src/lib/question-progress.ts:collectQuestions so counts match the web app.
 */
export function collectQuestions(node: unknown, type: QuestionType): string[] {
  if (!node || typeof node !== 'object') {
    return [];
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

/** Both types, de-duplicated. */
export function collectAllQuestions(node: unknown): string[] {
  return Array.from(
    new Set([...collectQuestions(node, 'essay'), ...collectQuestions(node, 'short-notes')]),
  );
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

/** Walk the whole bank for questions containing `query`. */
export function searchQuestions(query: string, limit = 60): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) {
    return [];
  }
  const hits: SearchHit[] = [];
  for (const year of YEAR_KEYS) {
    for (const subject of getSubjects(year)) {
      for (const type of ['essay', 'short-notes'] as QuestionType[]) {
        for (const question of collectQuestions(subject.node, type)) {
          if (question.toLowerCase().includes(needle)) {
            hits.push({
              question,
              year,
              yearLabel: YEAR_LABEL[year],
              subjectKey: subject.key,
              subjectName: subject.name,
              type,
            });
            if (hits.length >= limit) {
              return hits;
            }
          }
        }
      }
    }
  }
  return hits;
}
