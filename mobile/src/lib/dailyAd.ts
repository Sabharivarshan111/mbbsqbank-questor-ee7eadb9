import AsyncStorage from '@react-native-async-storage/async-storage';
import { showRewardedAd } from './ads';
import { isPremiumCached } from './premium';

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

/**
 * When the user last said "Not now" to each bucket.
 *
 * Only a confirmed ad marks the day's slot, so declining left nothing behind
 * and the very next theme change — or the next time you opened My Progress —
 * asked again. Toggling the theme twice was enough to be asked twice. (The web
 * app has the same hole; src/lib/daily-ad.ts only calls markShownFor from
 * onConfirm.)
 *
 * Consuming the whole day's slot on a decline would fix the nagging by giving
 * up the impression entirely, which is not a trade worth making with someone
 * else's revenue. A short cooldown fixes the actual complaint — being asked
 * again seconds later — while still allowing the day's one ad to happen later.
 *
 * These keys are native-only. The web app does not read them, and adding them
 * cannot change its behaviour.
 */
const DECLINE_STORAGE_KEY: Record<Bucket, string> = {
  progress: 'orbit:daily-ad-declined:progress',
  theme: 'orbit:daily-ad-declined:theme',
  questions: 'orbit:daily-ad-declined:questions',
};

/** Long enough to not be nagged while changing settings; short enough that the
 *  day's impression is still very likely to happen later. */
const DECLINE_COOLDOWN_MS = 10 * 60 * 1000;

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
  // Paid ad-free users never see rewarded ads.
  if (walkthroughActive || isPremiumCached()) {
    return;
  }
  const bucket = REASON_TO_BUCKET[reason];
  try {
    const last = await AsyncStorage.getItem(BUCKET_STORAGE_KEY[bucket]);
    if (last === today()) {
      return;
    }
    const declinedAt = await AsyncStorage.getItem(DECLINE_STORAGE_KEY[bucket]);
    if (declinedAt && Date.now() - Number(declinedAt) < DECLINE_COOLDOWN_MS) {
      // They already said no. Asking again immediately is nagging, not a
      // second chance.
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

/** Called when the user declines. Starts the cooldown; the day's slot stays
 *  unused, so the ad can still be offered later. */
export async function declineDailyAd(reason: DailyAdReason): Promise<void> {
  const bucket = REASON_TO_BUCKET[reason];
  try {
    await AsyncStorage.setItem(DECLINE_STORAGE_KEY[bucket], String(Date.now()));
  } catch {
    // Non-fatal: worst case they are asked again sooner.
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
