// Rewarded-ad helper that talks to the native Android wrapper's
// `window.AndroidBridge`. Safe no-op in browser / Lovable preview.
//
// Native surface (from the Android wrapper):
//   AndroidBridge.showRewardedAd()
//   AndroidBridge.isRewardedLoaded() -> boolean
//   AndroidBridge.showInterstitialAd()
//   AndroidBridge.isInterstitialAdLoaded() -> boolean
// Callbacks fired by native:
//   window.onRewardedAdCompleted(amount)
//   window.onRewardedAdDismissed()
//   window.onRewardedAdFailed()

const COOLDOWN_MS = 90_000;
const STORAGE_PREFIX = "orbit:ad:lastRewardedShownAt:v2";

const now = () => Date.now();
const storageKeyFor = (placement: string) => `${STORAGE_PREFIX}:${placement}`;

const withinCooldown = (placement: string) => {
  try {
    const raw = sessionStorage.getItem(storageKeyFor(placement));
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    if (Number.isNaN(ts)) return false;
    return now() - ts < COOLDOWN_MS;
  } catch {
    return false;
  }
};

const markShown = (placement: string) => {
  try {
    sessionStorage.setItem(storageKeyFor(placement), String(now()));
  } catch {
    // ignore
  }
};

const isNativeRewarded = (): boolean => {
  try {
    return typeof window !== "undefined" && !!window.AndroidBridge?.showRewardedAd;
  } catch {
    return false;
  }
};

const isNativeInterstitial = (): boolean => {
  try {
    return typeof window !== "undefined" && !!window.AndroidBridge?.showInterstitialAd;
  } catch {
    return false;
  }
};

export const AdService = {
  isNative(): boolean {
    return isNativeRewarded();
  },

  isRewardedReady(): boolean {
    try {
      const bridge = window.AndroidBridge;
      if (!bridge) return false;
      if (typeof bridge.isRewardedLoaded === "function") {
        return !!bridge.isRewardedLoaded();
      }
      // Older wrapper without readiness check — assume ready.
      return true;
    } catch {
      return false;
    }
  },

  isInterstitialReady(): boolean {
    try {
      const bridge = window.AndroidBridge;
      if (!bridge) return false;
      if (typeof bridge.isInterstitialAdLoaded === "function") {
        return !!bridge.isInterstitialAdLoaded();
      }
      return true;
    } catch {
      return false;
    }
  },

  /**
   * No-op kept for compatibility with existing callers. The native wrapper
   * preloads rewarded ads internally after each show, so JS doesn't need to
   * request loads.
   */
  preloadRewarded(): void {
    /* no-op */
  },

  /**
   * Trigger a native rewarded ad. Silent no-op in browser / preview.
   * `onReward` is invoked when the user finishes watching.
   * Per-placement 90s cooldown prevents spam across surfaces (progress,
   * theme, custom theme, etc.).
   */
  showRewarded(onReward?: (amount: number) => void, placement = "default"): void {
    try {
      if (!isNativeRewarded()) {
        console.log("[AdService] Rewarded skipped: not running in Android wrapper.");
        return;
      }
      if (withinCooldown(placement)) {
        console.log(`[AdService] Rewarded skipped: cooldown active for '${placement}'.`);
        return;
      }
      if (!AdService.isRewardedReady()) {
        console.log("[AdService] Rewarded not loaded yet; skipping this tap (no cooldown burned).");
        return;
      }

      const cleanup = () => {
        delete window.onRewardedAdCompleted;
        delete window.onRewardedAdDismissed;
        delete window.onRewardedAdFailed;
      };

      window.onRewardedAdCompleted = (amount: number) => {
        markShown(placement);
        try {
          onReward?.(amount);
        } catch (e) {
          console.warn("[AdService] onReward callback threw", e);
        }
        cleanup();
      };
      window.onRewardedAdDismissed = () => {
        markShown(placement);
        cleanup();
      };
      window.onRewardedAdFailed = () => {
        // Don't burn cooldown on failure — let user retry.
        console.warn("[AdService] Rewarded ad failed to show.");
        cleanup();
      };

      window.AndroidBridge!.showRewardedAd!();
    } catch (e) {
      console.warn("[AdService] showRewarded failed", e);
    }
  },

  /**
   * Trigger a native interstitial ad. Silent no-op in browser / preview.
   */
  showInterstitial(): void {
    try {
      if (!isNativeInterstitial()) return;
      if (!AdService.isInterstitialReady()) return;
      window.AndroidBridge!.showInterstitialAd!();
    } catch (e) {
      console.warn("[AdService] showInterstitial failed", e);
    }
  },
};
