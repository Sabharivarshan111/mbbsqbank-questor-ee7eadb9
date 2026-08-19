import { useCallback, useSyncExternalStore } from 'react';
import {
  readWallpaper,
  writeWallpaper,
  type Wallpaper,
} from '@/lib/wallpaper';

/**
 * The wallpaper, shared across every screen that draws it.
 *
 * A module-level store rather than context, for the same reason the progress
 * store is one: the background is read by a component wrapping whole screens,
 * and putting it in a provider would re-render every screen in the app each
 * time the dim slider moves a pixel.
 */

let current: Wallpaper | null = null;
let hydrated = false;
let version = 0;
const listeners = new Set<() => void>();

function emit() {
  version += 1;
  listeners.forEach(listener => listener());
}

export function hydrateWallpaper(): Promise<void> {
  return readWallpaper().then(value => {
    current = value;
    hydrated = true;
    emit();
  });
}

export function setWallpaper(next: Wallpaper | null): void {
  current = next;
  emit();
  writeWallpaper(next).catch(() => {});
}

/** Read without subscribing — for the editor's draft, which owns its own copy. */
export function getWallpaper(): Wallpaper | null {
  return current;
}

export function isWallpaperHydrated(): boolean {
  return hydrated;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const snapshot = () => version;

export function useWallpaper() {
  useSyncExternalStore(subscribe, snapshot, snapshot);
  const clear = useCallback(() => setWallpaper(null), []);
  return { wallpaper: current, set: setWallpaper, clear };
}
