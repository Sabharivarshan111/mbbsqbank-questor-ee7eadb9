// Unified once-per-calendar-day rewarded ad across placements
// (essays/short-notes, theme change, progress tab, custom theme...).
//
// Public API:
//   requestDailyAd(reason) -> shows a blocking "sorry for the inconvenience"
//     confirmation modal, then plays the rewarded ad on OK.
//     Silent no-op if today's ad was already shown or the walkthrough is active.

import { showRewardedAd } from "@/services/AndroidAds";

const KEY = "orbit:daily-ad:date";
const WALKTHROUGH_FLAG = "orbit:walkthrough-active";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function hasShownDailyAd(): boolean {
  try {
    return localStorage.getItem(KEY) === today();
  } catch {
    return false;
  }
}

export function markDailyAdShown() {
  try {
    localStorage.setItem(KEY, today());
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

export type DailyAdReason = "short-notes" | "theme" | "progress" | "custom-theme" | "questions";

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
      "A short sponsored ad will play once — this happens only ONE time per day and helps keep Orbit free. Tap OK to continue.",
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

/** Show the consent modal, then play the rewarded ad. No-op if already shown today or walkthrough active. */
export function requestDailyAd(reason: DailyAdReason): void {
  if (typeof window === "undefined") return;
  if (isWalkthroughActive()) return;
  if (hasShownDailyAd()) return;

  const { title, message } = REASON_TEXT[reason];
  const payload: DailyAdConsentPayload = {
    reason,
    title,
    message,
    onConfirm: () => {
      markDailyAdShown();
      void showRewardedAd(reason).catch(() => {});
    },
  };
  window.dispatchEvent(new CustomEvent<DailyAdConsentPayload>(DAILY_AD_EVENT, { detail: payload }));
}
