import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateDisplayName } from '@shared/profanity';
import { supabase } from './supabase';
import type { YearKey } from './questionBank';
import { warn } from '@/lib/log';

/**
 * Study profile.
 *
 * The on-device shape is deliberately identical to the web app's
 * `orbit-profile-v1` entry — `{ display_name, year }` with the short year
 * codes — so a user who has both installed sees one profile, not two.
 * `YearKey` ("second-year") is the app's internal form; conversion happens at
 * the storage boundary.
 */

export type Year = 'first' | 'second' | 'third' | 'final';

export interface LocalProfile {
  display_name: string;
  year: Year;
}

export interface CloudProfile extends LocalProfile {
  id: string;
  xp: number;
  streak: number;
  last_active_date: string | null;
  streak_freezes_available?: number;
}

const PROFILE_KEY = 'orbit-profile-v1';
const DEVICE_KEY = 'orbit-device-id';

export const YEAR_TO_KEY: Record<Year, YearKey> = {
  first: 'first-year',
  second: 'second-year',
  third: 'third-year',
  final: 'final-year',
};

export const KEY_TO_YEAR: Record<YearKey, Year> = {
  'first-year': 'first',
  'second-year': 'second',
  'third-year': 'third',
  'final-year': 'final',
};

export class DisplayNameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DisplayNameError';
  }
}

export async function readLocalProfile(): Promise<LocalProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<LocalProfile>;
    if (!parsed || typeof parsed.display_name !== 'string') {
      return null;
    }
    const year: Year =
      parsed.year === 'first' ||
      parsed.year === 'second' ||
      parsed.year === 'third' ||
      parsed.year === 'final'
        ? parsed.year
        : 'second';
    return { display_name: parsed.display_name, year };
  } catch {
    return null;
  }
}

async function writeLocalProfile(profile: LocalProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

async function getDeviceId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_KEY);
    if (existing) {
      return existing;
    }
    const id = `dev-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    await AsyncStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return `dev-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  }
}

/**
 * Persist the profile locally, then mirror it to Supabase, signing in
 * anonymously first if there is no session. Cloud failures are non-fatal —
 * the local write has already happened, so the app keeps working offline.
 */
export async function saveProfile(profile: LocalProfile): Promise<CloudProfile | null> {
  const check = validateDisplayName(profile.display_name);
  if (!check.ok) {
    throw new DisplayNameError(check.reason ?? 'Invalid name.');
  }

  const clean: LocalProfile = {
    display_name: profile.display_name.trim(),
    year: profile.year,
  };
  await writeLocalProfile(clean);

  try {
    let { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) {
        warn('Anonymous auth unavailable:', error.message);
        return null;
      }
      sessionData = (await supabase.auth.getSession()).data;
    }
    const userId = sessionData.session?.user?.id;
    if (!userId) {
      return null;
    }

    const deviceId = await getDeviceId();
    // Claims any profile previously created on this device, then upserts.
    const { data: merged, error: mergeError } = await supabase.rpc('claim_or_merge_profile', {
      _device_id: deviceId,
      _display_name: clean.display_name,
      _year: clean.year,
    });

    if (mergeError) {
      await supabase.from('profiles').upsert({
        id: userId,
        display_name: clean.display_name,
        year: clean.year,
        device_id: deviceId,
      });
    }

    return (merged as CloudProfile | null) ?? (await fetchCloudProfile());
  } catch (error) {
    warn('saveProfile cloud sync failed:', error);
    return null;
  }
}

export async function fetchCloudProfile(): Promise<CloudProfile | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) {
      return null;
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, year, xp, streak, last_active_date, streak_freezes_available')
      .eq('id', userId)
      .maybeSingle();
    return (data as CloudProfile | null) ?? null;
  } catch {
    return null;
  }
}

/**
 * Records today's visit and returns the refreshed streak. Backed by the same
 * `register_open` RPC the web app calls on launch.
 */
export async function registerOpen(): Promise<{ streak: number; last_active_date: string } | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      return null;
    }
    const { data, error } = await supabase.rpc('register_open');
    if (error) {
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    return row && typeof row.streak === 'number' ? row : null;
  } catch {
    return null;
  }
}
