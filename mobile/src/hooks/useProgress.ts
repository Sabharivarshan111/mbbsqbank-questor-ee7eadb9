import { useCallback, useSyncExternalStore } from 'react';
import { countDone, getSnapshot, subscribe } from '@/lib/progress';

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
