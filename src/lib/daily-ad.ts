// Unified once-per-calendar-day rewarded ad across placements
// (short-notes tab, theme change, progress tab, custom theme...).
//
// Public API:
//   requestDailyAd(reason) -> shows a blocking "sorry for the inconvenience"
//     confirmation modal, and after user taps OK plays the rewarded ad.
//     If today's ad was already shown, resolves immediately (silent no-op).

import { showRewardedAd } from "@/services/AndroidAds";

const KEY = "orbit:daily-ad:date";

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

export type DailyAdReason = "short-notes" | "theme" | "progress" | "custom-theme";

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
      "A short sponsored ad will play once — this happens only ONE time per day when you open Short Notes and helps keep Orbit free. Tap OK to continue.",
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

/** Show the consent modal, then play the rewarded ad. No-op if already shown today. */
export function requestDailyAd(reason: DailyAdReason): void {
  if (typeof window === "undefined") return;
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
