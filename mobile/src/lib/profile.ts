import AsyncStorage from '@react-native-async-storage/async-storage';
import { YearKey } from './questionBank';

/** Local, device-only study profile. Mirrors the web app's orbit-profile-v1. */
export interface Profile {
  name: string;
  year: YearKey;
}

const STORAGE_KEY = 'orbit-profile-v1';

export const DEFAULT_PROFILE: Profile = {
  name: '',
  year: 'second-year',
};

// Web stores the year as first/second/third/final; keep reading those.
const LEGACY_YEAR: Record<string, YearKey> = {
  first: 'first-year',
  second: 'second-year',
  third: 'third-year',
  final: 'final-year',
};

export async function loadProfile(): Promise<Profile> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PROFILE;
    }
    const parsed = JSON.parse(raw) as Partial<Profile> & { year?: string };
    const year = parsed.year
      ? LEGACY_YEAR[parsed.year] ?? (parsed.year as YearKey)
      : DEFAULT_PROFILE.year;
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      year,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.warn('saveProfile failed:', error);
  }
}
