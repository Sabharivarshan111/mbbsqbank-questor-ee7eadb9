import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The order of the subject cards, per year.
 *
 * Per year because the subjects are: someone in second year arranging
 * Pathology first has said nothing about where Anatomy belongs in first year,
 * and a single shared list would have to guess.
 */
const KEY = 'orbit:subject-order-v1';

type Stored = Record<string, string[]>;

/**
 * Keep the stored order, drop anything that is no longer a subject, and
 * append anything new. Same contract as the Home sections: a bank that gains
 * a subject must not leave anyone with a grid that is missing it.
 */
export function reconcileSubjects(stored: unknown, actual: string[]): string[] {
  const known = new Set(actual);
  const seen = new Set<string>();
  const out: string[] = [];
  if (Array.isArray(stored)) {
    for (const value of stored) {
      if (typeof value === 'string' && known.has(value) && !seen.has(value)) {
        seen.add(value);
        out.push(value);
      }
    }
  }
  for (const key of actual) {
    if (!seen.has(key)) {
      out.push(key);
    }
  }
  return out;
}

export function useSubjectOrder(year: string, subjects: string[]) {
  const [stored, setStored] = useState<Stored>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then(value => {
        if (value) {
          try {
            const parsed = JSON.parse(value) as Stored;
            if (parsed && typeof parsed === 'object') {
              setStored(parsed);
            }
          } catch {
            // A corrupt entry should not stop the grid from rendering.
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const order = reconcileSubjects(stored[year], subjects);

  /**
   * The order the cards are *rendered* in — see Reorderable for why that is
   * held apart from the current order. It is pinned once per year, and only
   * after storage has answered: seeding it from the default and then swapping
   * to a saved order would move every card on the first frame after launch.
   */
  const rendered = useRef<{ year: string; list: string[] } | null>(null);
  if (loaded && (!rendered.current || rendered.current.year !== year)) {
    rendered.current = { year, list: order };
  }

  const save = useCallback(
    (next: string[]) => {
      setStored(previous => {
        const updated = { ...previous, [year]: next };
        AsyncStorage.setItem(KEY, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    },
    [year],
  );

  return { order, rendered: rendered.current?.list ?? null, save };
}
