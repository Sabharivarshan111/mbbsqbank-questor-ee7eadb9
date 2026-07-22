// Per-placement daily rewarded ad system.
// Three INDEPENDENT daily buckets — user can see up to 3 rewarded ads/day total:
//   • "progress"       → opening My Progress
//   • "theme"          → theme changes (preset + custom)
//   • "questions"      → opening an essay/short-notes topic (essay+short share one bucket)
//
// Each bucket tracks its own "last shown date" in localStorage, so the ad shows
// at most once per calendar day per bucket, but the buckets do NOT share a cap.

import { showRewardedAd } from "@/services/AndroidAds";

const WALKTHROUGH_FLAG = "orbit:walkthrough-active";

/** Bucket key = independent daily cap. */
type Bucket = "progress" | "theme" | "questions";

const BUCKET_STORAGE_KEY: Record<Bucket, string> = {
  progress: "orbit:daily-ad:progress",
  theme: "orbit:daily-ad:theme",
  questions: "orbit:daily-ad:questions",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function hasShownFor(bucket: Bucket): boolean {
  try {
    return localStorage.getItem(BUCKET_STORAGE_KEY[bucket]) === today();
  } catch {
    return false;
  }
}

function markShownFor(bucket: Bucket) {
  try {
    localStorage.setItem(BUCKET_STORAGE_KEY[bucket], today());
  } catch {
    /* ignore */
  }
}

export function setWalkthroughActive(active: boolean) {
  try {
    if (active) sessionStorage.setItem(WALKTHROUGH_FLAG, "1");
    else sessionStorage.removeItem(WALKTHROUGH_FLAG);
  } catch { /* ignore */ }
}

function isWalkthroughActive(): boolean {
  try {
    return sessionStorage.getItem(WALKTHROUGH_FLAG) === "1";
  } catch {
    return false;
  }
}

// Public reason strings kept broad so existing call sites don't need to change.
export type DailyAdReason = "short-notes" | "theme" | "progress" | "custom-theme" | "questions";

const REASON_TO_BUCKET: Record<DailyAdReason, Bucket> = {
  progress: "progress",
  theme: "theme",
  "custom-theme": "theme",
  questions: "questions",
  "short-notes": "questions",
};

export type DailyAdConsentPayload = {
  reason: DailyAdReason;
  title: string;
  message: string;
  onConfirm: () => void;
};

export const DAILY_AD_EVENT = "orbit:daily-ad-consent";

const REASON_TEXT: Record<DailyAdReason, { title: string; message: string }> = {
  "short-notes": {
    title: "Sorry for the inconvenience",
    message:
      "A short sponsored ad will play once — this happens only ONE time per day when you open essays or short notes and helps keep Orbit free. Tap OK to continue.",
  },
  questions: {
    title: "Sorry for the inconvenience",
    message:
      "A short sponsored ad will play once — this happens only ONE time per day when you open essays or short notes and helps keep Orbit free. Tap OK to continue.",
  },
  theme: {
    title: "Sorry for the inconvenience",
    message:
      "A short sponsored ad will play once — this happens only ONE time per day when you change themes and helps keep Orbit free. Tap OK to continue.",
  },
  progress: {
    title: "Sorry for the inconvenience",
    message:
      "A short sponsored ad will play once — this happens only ONE time per day when you open My Progress and helps keep Orbit free. Tap OK to continue.",
  },
  "custom-theme": {
    title: "Sorry for the inconvenience",
    message:
      "A short sponsored ad will play once — this happens only ONE time per day when you apply a custom theme and helps keep Orbit free. Tap OK to continue.",
  },
};

/**
 * Show the consent modal, then play the rewarded ad.
 * No-op if this bucket's ad was already shown today or the walkthrough is active.
 */
export function requestDailyAd(reason: DailyAdReason): void {
  if (typeof window === "undefined") return;
  if (isWalkthroughActive()) return;

  const bucket = REASON_TO_BUCKET[reason];
  if (hasShownFor(bucket)) return;

  const { title, message } = REASON_TEXT[reason];
  const payload: DailyAdConsentPayload = {
    reason,
    title,
    message,
    onConfirm: () => {
      markShownFor(bucket);
      void showRewardedAd(reason).catch(() => {});
    },
  };
  window.dispatchEvent(new CustomEvent<DailyAdConsentPayload>(DAILY_AD_EVENT, { detail: payload }));
}

/** Back-compat helpers (unused by new call sites, kept in case any code still imports them). */
export function hasShownDailyAd(): boolean {
  return hasShownFor("progress") && hasShownFor("theme") && hasShownFor("questions");
}
export function markDailyAdShown() {
  markShownFor("progress"); markShownFor("theme"); markShownFor("questions");
}
