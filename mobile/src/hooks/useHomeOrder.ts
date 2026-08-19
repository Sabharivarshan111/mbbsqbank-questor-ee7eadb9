import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The order of the Home screen's sections.
 *
 * Not shared with the web app: the web layout is a different set of blocks in
 * a different grid, so a shared key would mean one of them honouring an order
 * that was never chosen for it. The key is versioned for the same reason the
 * others are — adding a section later must not leave stored orders half-valid.
 */
const KEY = 'orbit:home-order-v1';

export const HOME_SECTIONS = ['hero', 'quick', 'whatsapp', 'subjects', 'stats'] as const;
export type HomeSection = (typeof HOME_SECTIONS)[number];

export const HOME_SECTION_LABEL: Record<HomeSection, string> = {
  hero: 'Welcome card',
  quick: 'Quick actions',
  whatsapp: 'WhatsApp community',
  subjects: 'Your subjects',
  stats: 'Study stats',
};

/**
 * Reconcile a stored order against the sections that exist today.
 *
 * Anything unknown is dropped and anything missing is appended, so a release
 * that adds or removes a section cannot leave someone with a Home screen that
 * is missing a block — the failure mode of storing a plain array and trusting
 * it. Appending rather than inserting is the honest default: we know the new
 * section exists, not where this particular person would want it.
 */
export function reconcileOrder(stored: unknown): HomeSection[] {
  const known = new Set<string>(HOME_SECTIONS);
  const seen = new Set<string>();
  const out: HomeSection[] = [];
  if (Array.isArray(stored)) {
    for (const value of stored) {
      if (typeof value === 'string' && known.has(value) && !seen.has(value)) {
        seen.add(value);
        out.push(value as HomeSection);
      }
    }
  }
  for (const section of HOME_SECTIONS) {
    if (!seen.has(section)) {
      out.push(section);
    }
  }
  return out;
}

export function useHomeOrder() {
  const [order, setOrder] = useState<HomeSection[]>([...HOME_SECTIONS]);
  /**
   * The order the rows are *rendered* in, fixed for the life of the screen.
   *
   * Reordering only moves transforms; the tree never re-orders. Committing a
   * drag by re-rendering the children in the new order would repaint every
   * section at the exact moment the transforms are reset to zero, and any
   * disagreement between the two is a visible flash. This way the commit
   * changes nothing on screen, which is what a finished drag should look like.
   */
  const [rendered, setRendered] = useState<HomeSection[]>([...HOME_SECTIONS]);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then(value => {
        if (!value) {
          return;
        }
        try {
          const next = reconcileOrder(JSON.parse(value));
          setOrder(next);
          setRendered(next);
        } catch {
          // A corrupt entry should not stop Home from rendering.
        }
      })
      .catch(() => {});
  }, []);

  const save = useCallback((next: HomeSection[]) => {
    setOrder(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const reset = useCallback(() => {
    const next = [...HOME_SECTIONS];
    setOrder(next);
    setRendered(next);
    AsyncStorage.removeItem(KEY).catch(() => {});
  }, []);

  return { order, rendered, save, reset };
}
