import { useCallback, useSyncExternalStore } from 'react';
import {
  fetchCloudProfile,
  readLocalProfile,
  registerOpen,
  saveProfile as persistProfile,
  YEAR_TO_KEY,
  type CloudProfile,
  type LocalProfile,
  type Year,
} from '@/lib/profile';
import type { YearKey } from '@/lib/questionBank';

/**
 * Small store so every screen sees the same profile. The profile is read once
 * at launch and re-published on save, rather than each screen loading its own
 * copy and drifting.
 */
let localProfile: LocalProfile | null = null;
let cloudProfile: CloudProfile | null = null;
let hydrated = false;
let version = 0;
const listeners = new Set<() => void>();

function emit() {
  version += 1;
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return version;
}

/** Load the stored profile and refresh streak/XP from the cloud. */
export async function hydrateProfile(): Promise<void> {
  localProfile = await readLocalProfile();
  hydrated = true;
  emit();

  const cloud = await fetchCloudProfile();
  if (cloud) {
    cloudProfile = cloud;
    emit();
  }
  const open = await registerOpen();
  if (open && cloudProfile) {
    cloudProfile = { ...cloudProfile, streak: open.streak, last_active_date: open.last_active_date };
    emit();
  }
}

export function useProfile() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const save = useCallback(async (next: LocalProfile) => {
    const cloud = await persistProfile(next);
    localProfile = next;
    if (cloud) {
      cloudProfile = cloud;
    }
    emit();
  }, []);

  const setYear = useCallback(
    async (year: Year) => {
      const base = localProfile ?? { display_name: '', year };
      // Renaming is a separate, validated action; only the year moves here.
      if (!base.display_name) {
        localProfile = { ...base, year };
        emit();
        return;
      }
      await save({ ...base, year });
    },
    [save],
  );

  const year: Year = localProfile?.year ?? 'second';

  return {
    local: localProfile,
    cloud: cloudProfile,
    hydrated,
    /** Convenience: the year in the app's internal key form. */
    yearKey: YEAR_TO_KEY[year] as YearKey,
    year,
    displayName: localProfile?.display_name ?? '',
    streak: cloudProfile?.streak ?? 0,
    freezes: cloudProfile?.streak_freezes_available ?? 0,
    needsOnboarding: hydrated && !localProfile,
    save,
    setYear,
  };
}
