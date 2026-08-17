import { supabase } from './supabase';
import { collectQuestions, type BankNode } from './questionBank';
import { clampQuestions } from './notesLimits';

/**
 * Handwritten-notes generation, ported from
 * src/components/handwritten/HandwrittenNotesHub.tsx.
 *
 * The edge function generates a topic's notes in batches of questions, so a
 * large topic arrives over several calls that are merged client-side. The
 * batch size, inter-batch delay and request shape all match the web app, since
 * they are tuned to the provider's throughput limits.
 */

export interface Section {
  type: string;
  title: string;
  icon?: string;
  pyqYears?: string[];
  payload: Record<string, unknown>;
}

export interface NotesContent {
  highYieldTip?: string;
  pyqYears?: string[];
  sections: Section[];
}

export interface LeafTopic {
  /** Stable identity for the cache: "pathology::paper-1/neoplasia". */
  key: string;
  name: string;
  breadcrumb: string;
  questions: string[];
}

export const NOTES_BATCH_SIZE = 10;
/** Keeps direct Google AI Studio keys under safer throughput. */
export const INTER_BATCH_DELAY_MS = 25_000;

/** A node is a leaf when its children are only question buckets. */
function isLeafShape(node: BankNode): boolean {
  const subs = node?.subtopics as Record<string, BankNode> | undefined;
  if (!subs) {
    return true;
  }
  return Object.keys(subs).every(
    key =>
      key === 'essay' ||
      key === 'short-note' ||
      key === 'short-notes' ||
      Array.isArray(subs[key]?.questions),
  );
}

/** Every leaf topic under a subject that has at least one question. */
export function flattenSubjectTopics(subjectKey: string, node: BankNode | undefined): LeafTopic[] {
  const out: LeafTopic[] = [];

  function walk(current: BankNode | undefined, keyPath: string[], namePath: string[]) {
    if (!current || typeof current !== 'object') {
      return;
    }
    const unique = Array.from(
      new Set([
        ...collectQuestions(current, 'essay'),
        ...collectQuestions(current, 'short-notes'),
      ]),
    ).filter(Boolean);

    const subs = current.subtopics as Record<string, BankNode> | undefined;
    const hasChildren = subs && typeof subs === 'object';

    if (
      unique.length > 0 &&
      (!hasChildren || Object.keys(subs).length === 0 || isLeafShape(current))
    ) {
      out.push({
        key: `${subjectKey}::${keyPath.join('/')}`,
        name: namePath[namePath.length - 1] ?? current.name ?? 'Topic',
        breadcrumb: namePath.join(' › '),
        questions: unique,
      });
      return;
    }

    if (hasChildren) {
      for (const [key, value] of Object.entries(subs)) {
        walk(value, [...keyPath, key], [...namePath, value?.name ?? key]);
      }
    }
  }

  walk(node, [], [node?.name ?? subjectKey]);

  const seen = new Set<string>();
  return out.filter(topic => (seen.has(topic.key) ? false : (seen.add(topic.key), true)));
}

/** Combine per-batch results, folding same-titled sections together. */
export function mergeNotes(parts: (NotesContent | null)[]): NotesContent {
  const merged: NotesContent = { highYieldTip: '', pyqYears: [], sections: [] };
  const extraTips: string[] = [];
  const years = new Set<string>();
  const byTitle = new Map<string, Section>();

  for (const part of parts) {
    if (!part) {
      continue;
    }
    if (part.highYieldTip) {
      if (!merged.highYieldTip) {
        merged.highYieldTip = part.highYieldTip;
      } else {
        extraTips.push(part.highYieldTip);
      }
    }
    if (Array.isArray(part.pyqYears)) {
      for (const year of part.pyqYears) {
        if (year) {
          years.add(String(year));
        }
      }
    }
    if (Array.isArray(part.sections)) {
      for (const section of part.sections) {
        const key = (section?.title ?? '').toLowerCase().trim();
        if (!key) {
          merged.sections.push(section);
          continue;
        }
        const existing = byTitle.get(key);
        if (!existing) {
          byTitle.set(key, section);
          merged.sections.push(section);
        } else if (
          Array.isArray(existing.payload?.items) &&
          Array.isArray(section.payload?.items)
        ) {
          existing.payload.items = [
            ...(existing.payload.items as unknown[]),
            ...(section.payload.items as unknown[]),
          ];
        }
      }
    }
  }

  if (extraTips.length) {
    merged.highYieldTip = `${merged.highYieldTip} ${extraTips.join(' ')}`.trim();
  }
  merged.pyqYears = Array.from(years).sort();
  return merged;
}

export interface BatchResult {
  cached: boolean;
  content: NotesContent;
  batchIndex: number;
  totalBatches: number;
  hasMore: boolean;
  estSecondsPerBatch: number;
}

interface FunctionErrorContext {
  json?: () => Promise<{ error?: unknown }>;
  text?: () => Promise<string>;
}

/** Edge-function errors carry the useful message in the response body. */
async function unwrapError(error: { message?: string; context?: unknown }): Promise<Error> {
  let message = error.message ?? 'Failed';
  try {
    const context = error.context as FunctionErrorContext | undefined;
    if (context?.json) {
      const body = await context.json();
      if (body?.error) {
        message = typeof body.error === 'string' ? body.error : JSON.stringify(body.error);
      }
    } else if (context?.text) {
      const text = await context.text();
      if (text) {
        message = text.slice(0, 300);
      }
    }
  } catch {
    // Keep the original message.
  }
  return new Error(message);
}

interface TopicRequest {
  topic: LeafTopic;
  yearLabel: string;
  subject: string;
}

function baseBody({ topic, yearLabel, subject }: TopicRequest) {
  return {
    subtopicKey: topic.key,
    year: yearLabel,
    subject,
    subtopicName: topic.name,
    questions: clampQuestions(topic.questions),
  };
}

export async function fetchNotesBatch(
  request: TopicRequest,
  batchIndex: number,
  regenerate: boolean,
): Promise<BatchResult> {
  const { data, error } = await supabase.functions.invoke('generate-handwritten-notes', {
    body: {
      ...baseBody(request),
      batchIndex,
      batchSize: NOTES_BATCH_SIZE,
      // Only the first batch may bust the cache.
      regenerate: regenerate && batchIndex === 0,
    },
  });
  if (error) {
    throw await unwrapError(error);
  }
  if (data?.error) {
    throw new Error(String(data.error));
  }
  return data as BatchResult;
}

/** Persist the merged result so later opens hit the cache. Non-fatal. */
export async function saveMergedNotes(
  request: TopicRequest,
  content: NotesContent,
): Promise<void> {
  try {
    await supabase.functions.invoke('generate-handwritten-notes', {
      body: { ...baseBody(request), saveContent: true, content },
    });
  } catch {
    // Caching is best-effort.
  }
}

export async function applyNotesEdit(
  request: TopicRequest,
  content: NotesContent,
  editInstruction: string,
): Promise<NotesContent> {
  const { data, error } = await supabase.functions.invoke('generate-handwritten-notes', {
    body: { ...baseBody(request), content, editInstruction },
  });
  if (error) {
    throw await unwrapError(error);
  }
  if (data?.error) {
    throw new Error(String(data.error));
  }
  const updated = data?.content as NotesContent | undefined;
  if (!updated?.sections) {
    throw new Error('AI edit returned invalid notes.');
  }
  return updated;
}
