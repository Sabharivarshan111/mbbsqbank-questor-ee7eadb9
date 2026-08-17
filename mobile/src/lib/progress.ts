import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { warn } from '@/lib/log';

/**
 * Completion state for individual questions.
 *
 * The web app reads localStorage synchronously inside render. AsyncStorage is
 * async, so the whole set is hydrated once at launch into an in-memory Set and
 * components subscribe to it via useSyncExternalStore. Writes update memory
 * first (instant UI), then persist and sync to Supabase in the background.
 *
 * Storage keys are identical to the web app's, so a signed-in user sees the
 * same progress on both.
 */

const KEY_PREFIX = 'question-';

let doneIds = new Set<string>();
let hydrated = false;
let version = 0;

const listeners = new Set<() => void>();

/**
 * Per-question listeners, keyed by question id.
 *
 * There are two kinds of subscriber and they want very different things:
 *
 *   • Counts ("142 of 405 done") care about *any* change, so they use the
 *     global `version` below.
 *   • A question row cares only about its own question.
 *
 * Rows used the global version too, which meant ticking one checkbox
 * re-rendered every row mounted in the list — a dozen or so with the current
 * virtualization window, each re-running its star/page-number parsing. On a
 * cheap phone that is the lag between the tap and the tick appearing.
 *
 * Keeping a listener set per id means a tick re-renders exactly one row.
 */
const questionListeners = new Map<string, Set<() => void>>();

function emit() {
  version += 1;
  for (const listener of listeners) {
    listener();
  }
}

/** Notify one question's rows. For single-question changes. */
function emitQuestion(id: string) {
  const set = questionListeners.get(id);
  if (set) {
    for (const listener of set) {
      listener();
    }
  }
}

/** Notify every question row. For hydration and cloud merges. */
function emitAllQuestions() {
  for (const set of questionListeners.values()) {
    for (const listener of set) {
      listener();
    }
  }
}

/** Subscribe to one question. Used by useQuestionDone. */
export function subscribeQuestion(id: string, listener: () => void): () => void {
  let set = questionListeners.get(id);
  if (!set) {
    set = new Set();
    questionListeners.set(id, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) {
      // Rows unmount constantly as the list scrolls; leaving empty sets behind
      // would grow the map for the life of the process.
      questionListeners.delete(id);
    }
  };
}

/** Snapshot for one question, by id. */
export function isQuestionIdDone(id: string): boolean {
  return doneIds.has(id);
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): number {
  return version;
}

export function isHydrated(): boolean {
  return hydrated;
}

export function getQuestionId(question: string): string {
  return `${KEY_PREFIX}${question.slice(0, 50).replace(/\s+/g, '-')}`;
}

export function isQuestionDone(question: string): boolean {
  return doneIds.has(getQuestionId(question));
}

export function countDone(questions: string[]): number {
  let total = 0;
  for (const question of questions) {
    if (doneIds.has(getQuestionId(question))) {
      total += 1;
    }
  }
  return total;
}

export function totalDone(): number {
  return doneIds.size;
}

/** Load persisted completion state. Call once, before the UI reads counts. */
export async function hydrateProgress(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const questionKeys = keys.filter(key => key.startsWith(KEY_PREFIX));
    if (questionKeys.length > 0) {
      const entries = await AsyncStorage.getMany(questionKeys);
      doneIds = new Set(
        Object.entries(entries)
          .filter(([, value]) => value === 'true')
          .map(([key]) => key),
      );
    }
  } catch (error) {
    warn('hydrateProgress failed:', error);
  } finally {
    hydrated = true;
    emit();
    emitAllQuestions();
  }
}

export function setQuestionDone(question: string, done: boolean): void {
  const id = getQuestionId(question);
  if (done) {
    doneIds.add(id);
  } else {
    doneIds.delete(id);
  }
  emit();
  emitQuestion(id);

  AsyncStorage.setItem(id, done ? 'true' : 'false').catch(error =>
    warn('setQuestionDone persist failed:', error),
  );

  // The RPCs are idempotent, so an un-tick always lowers XP even if this
  // device never recorded the original tick.
  const rpc = done ? 'record_question_done' : 'record_question_undone';
  void (async () => {
    try {
      const { error } = await supabase.rpc(rpc, { _question_id: id });
      if (error) {
        warn(`${rpc} failed:`, error);
      }
    } catch (error) {
      warn(`${rpc} threw:`, error);
    }
  })();
}

export function toggleQuestionDone(question: string): boolean {
  const next = !isQuestionDone(question);
  setQuestionDone(question, next);
  return next;
}

let pushing = false;

/** Push every locally-completed question to the cloud in chunks. */
export async function pushProgressToCloud(): Promise<void> {
  if (pushing || doneIds.size === 0) {
    return;
  }
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) {
    return;
  }
  pushing = true;
  try {
    const ids = Array.from(doneIds);
    const CHUNK = 500;
    for (let i = 0; i < ids.length; i += CHUNK) {
      await supabase.rpc('record_questions_done', { _question_ids: ids.slice(i, i + CHUNK) });
    }
  } catch (error) {
    warn('pushProgressToCloud failed:', error);
  } finally {
    pushing = false;
  }
}

/** Merge cloud rows into local state. Never deletes — un-ticks are explicit. */
export async function pullProgressFromCloud(): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) {
      return;
    }
    const { data, error } = await supabase
      .from('question_progress')
      .select('question_id')
      .eq('user_id', userId);
    if (error) {
      warn('pullProgressFromCloud failed:', error);
      return;
    }
    const incoming: Record<string, string> = {};
    let added = false;
    for (const row of (data ?? []) as { question_id: string }[]) {
      if (row.question_id && !doneIds.has(row.question_id)) {
        doneIds.add(row.question_id);
        incoming[row.question_id] = 'true';
        added = true;
      }
    }
    if (added) {
      await AsyncStorage.setMany(incoming);
      emit();
      // A cloud merge can flip any number of questions at once.
      emitAllQuestions();
    }
  } catch (error) {
    warn('pullProgressFromCloud threw:', error);
  }
}

/** Non-destructive two-way sync. Safe to call on launch and on sign-in. */
export async function reconcileProgress(): Promise<void> {
  await pullProgressFromCloud();
  await pushProgressToCloud();
}
