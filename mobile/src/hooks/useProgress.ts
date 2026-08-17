import { useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  countDone,
  getQuestionId,
  getSnapshot,
  isQuestionIdDone,
  subscribe,
  subscribeQuestion,
} from '@/lib/progress';

/**
 * Re-renders the caller whenever any question's completion state changes.
 * Returns the store version so memoised counts can depend on it.
 */
export function useProgressVersion(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * A `countDone` bound to the current store version. Depending on this function
 * inside useMemo recomputes counts when progress changes — and unlike passing
 * the raw version number, it is a dependency the linter can verify.
 */
export function useCountDone(): (questions: string[]) => number {
  const version = useProgressVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- rebind on store change
  return useCallback((questions: string[]) => countDone(questions), [version]);
}

/**
 * Completion state for a single question.
 *
 * Prefer this over useProgressVersion() in anything rendered per row. The
 * version hook fires for every change in the store, so a list of rows using it
 * all re-render when any one question is ticked; this fires only when *this*
 * question changes.
 */
export function useQuestionDone(question: string): boolean {
  const id = useMemo(() => getQuestionId(question), [question]);
  const subscribeToId = useCallback(
    (listener: () => void) => subscribeQuestion(id, listener),
    [id],
  );
  const snapshot = useCallback(() => isQuestionIdDone(id), [id]);
  return useSyncExternalStore(subscribeToId, snapshot, snapshot);
}
