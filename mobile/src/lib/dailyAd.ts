import AsyncStorage from '@react-native-async-storage/async-storage';
import { showRewardedAd } from './ads';

/**
 * Per-placement daily rewarded ads, ported from src/lib/daily-ad.ts.
 *
 * Three INDEPENDENT buckets, so a user can see at most three rewarded ads a
 * day — one per bucket. The buckets do not share a cap:
 *   • "progress"  → opening My Progress
 *   • "theme"     → changing the theme
 *   • "questions" → opening an essay / short-notes topic
 *
 * Storage keys match the web app's, so the cap carries across both installs
 * rather than each showing its own ad on the same day.
 */

export type DailyAdReason =
  | 'progress'
  | 'theme'
  | 'custom-theme'
  | 'questions'
  | 'short-notes';

type Bucket = 'progress' | 'theme' | 'questions';

const REASON_TO_BUCKET: Record<DailyAdReason, Bucket> = {
  progress: 'progress',
  theme: 'theme',
  'custom-theme': 'theme',
  questions: 'questions',
  'short-notes': 'questions',
};

const BUCKET_STORAGE_KEY: Record<Bucket, string> = {
  progress: 'orbit:daily-ad:progress',
  theme: 'orbit:daily-ad:theme',
  questions: 'orbit:daily-ad:questions',
};

const REASON_TEXT: Record<DailyAdReason, { title: string; message: string }> = {
  'short-notes': {
    title: 'Sorry for the inconvenience',
    message:
      'A short sponsored ad will play once — this happens only ONE time per day when you open essays or short notes and helps keep Orbit free. Tap OK to continue.',
  },
  questions: {
    title: 'Sorry for the inconvenience',
    message:
      'A short sponsored ad will play once — this happens only ONE time per day when you open essays or short notes and helps keep Orbit free. Tap OK to continue.',
  },
  theme: {
    title: 'Sorry for the inconvenience',
    message:
      'A short sponsored ad will play once — this happens only ONE time per day when you change themes and helps keep Orbit free. Tap OK to continue.',
  },
  progress: {
    title: 'Sorry for the inconvenience',
    message:
      'A short sponsored ad will play once — this happens only ONE time per day when you open My Progress and helps keep Orbit free. Tap OK to continue.',
  },
  'custom-theme': {
    title: 'Sorry for the inconvenience',
    message:
      'A short sponsored ad will play once — this happens only ONE time per day when you apply a custom theme and helps keep Orbit free. Tap OK to continue.',
  },
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Set while the walkthrough runs, so onboarding is never interrupted. */
let walkthroughActive = false;
export function setWalkthroughActive(active: boolean): void {
  walkthroughActive = active;
}

/** Paid ad-free users never see rewarded ads. */
let premium = false;
export function setPremiumCached(value: boolean): void {
  premium = value;
}

export interface DailyAdPrompt {
  reason: DailyAdReason;
  title: string;
  message: string;
}

type Listener = (prompt: DailyAdPrompt) => void;
const listeners = new Set<Listener>();

export function subscribeDailyAd(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Ask to play this bucket's ad. No-op when it already ran today, during the
 * walkthrough, or for premium users. The prompt is shown first; the ad only
 * plays after the user accepts.
 */
export async function requestDailyAd(reason: DailyAdReason): Promise<void> {
  if (walkthroughActive || premium) {
    return;
  }
  const bucket = REASON_TO_BUCKET[reason];
  try {
    const last = await AsyncStorage.getItem(BUCKET_STORAGE_KEY[bucket]);
    if (last === today()) {
      return;
    }
  } catch {
    // Unreadable storage should not spam ads; treat as already shown.
    return;
  }

  const { title, message } = REASON_TEXT[reason];
  for (const listener of listeners) {
    listener({ reason, title, message });
  }
}

/** Called when the user accepts the prompt. Marks the bucket, then plays. */
export async function confirmDailyAd(reason: DailyAdReason): Promise<void> {
  const bucket = REASON_TO_BUCKET[reason];
  try {
    // Marked before showing, matching the web app: a failed or skipped ad
    // still consumes the day's slot rather than re-prompting on every open.
    await AsyncStorage.setItem(BUCKET_STORAGE_KEY[bucket], today());
  } catch {
    // Non-fatal.
  }
  await showRewardedAd().catch(() => undefined);
}
