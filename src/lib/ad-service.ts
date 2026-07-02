// Rewarded-ad-only helper that talks to the native Android wrapper's
// `window.AndroidBridge`. Safe no-op in browser / Lovable preview.

const COOLDOWN_MS = 90_000;
const STORAGE_KEY = "orbit:ad:lastRewardedAt";

const now = () => Date.now();

const withinCooldown = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    if (Number.isNaN(ts)) return false;
    return now() - ts < COOLDOWN_MS;
  } catch {
    return false;
  }
};

const markShown = () => {
  try {
    sessionStorage.setItem(STORAGE_KEY, String(now()));
  } catch {
    // ignore
  }
};

export const AdService = {
  isNative(): boolean {
    try {
      return typeof window !== "undefined" && !!window.AndroidBridge?.showRewardedAd;
    } catch {
      return false;
    }
  },

  /**
   * Trigger a native AdMob Rewarded Ad. Fire-and-forget.
   * `onReward` is invoked from the Android side via
   * `window.onRewardedAdCompleted(amount)` when the user finishes watching.
   * In browser / preview this is a silent no-op.
   */
  showRewarded(onReward?: (amount: number) => void): void {
    try {
      if (!AdService.isNative()) {
        console.log("[AdService] Rewarded skipped: not running in Android wrapper.");
        return;
      }
      if (withinCooldown()) {
        console.log("[AdService] Rewarded skipped: within cooldown window.");
        return;
      }
      if (onReward) {
        window.onRewardedAdCompleted = (amount: number) => {
          try {
            onReward(amount);
          } catch (e) {
            console.warn("[AdService] onReward callback threw", e);
          }
        };
      }
      markShown();
      window.AndroidBridge!.showRewardedAd!();
    } catch (e) {
      console.warn("[AdService] showRewarded failed", e);
    }
  },
};
