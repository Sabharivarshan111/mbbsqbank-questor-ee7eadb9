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

// Track load state on the JS side so we don't re-request while one is inflight.
let loadInFlight = false;

const wireLoadCallbacks = () => {
  if (typeof window === "undefined") return;
  if (!window.onRewardedAdLoaded) {
    window.onRewardedAdLoaded = () => {
      loadInFlight = false;
      console.log("[AdService] Rewarded ad loaded and ready.");
    };
  }
  if (!window.onRewardedAdDismissed) {
    window.onRewardedAdDismissed = () => {
      console.log("[AdService] Rewarded ad dismissed; preloading next.");
      AdService.preloadRewarded();
    };
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

  isRewardedReady(): boolean {
    try {
      const bridge = window.AndroidBridge;
      if (!bridge) return false;
      if (typeof bridge.isRewardedAdReady === "function") {
        return !!bridge.isRewardedAdReady();
      }
      // Native wrapper hasn't implemented the readiness check yet — assume ready
      // so we fall back to legacy show-directly behavior.
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Ask the native side to start loading a rewarded ad. Safe to call often;
   * the JS-side `loadInFlight` guard debounces repeat calls until the native
   * side pings `window.onRewardedAdLoaded()`.
   */
  preloadRewarded(): void {
    try {
      if (!AdService.isNative()) return;
      wireLoadCallbacks();
      const bridge = window.AndroidBridge!;
      if (typeof bridge.loadRewardedAd !== "function") {
        // Older native wrapper — nothing to preload against.
        return;
      }
      if (loadInFlight) return;
      if (typeof bridge.isRewardedAdReady === "function" && bridge.isRewardedAdReady()) {
        return; // already have one waiting
      }
      loadInFlight = true;
      bridge.loadRewardedAd();
      console.log("[AdService] Rewarded ad preload requested.");
    } catch (e) {
      loadInFlight = false;
      console.warn("[AdService] preloadRewarded failed", e);
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
      wireLoadCallbacks();

      if (!AdService.isRewardedReady()) {
        console.log("[AdService] Rewarded not ready; preloading for next trigger.");
        AdService.preloadRewarded();
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
      // Kick off the next preload so subsequent triggers are instant.
      setTimeout(() => AdService.preloadRewarded(), 500);
    } catch (e) {
      console.warn("[AdService] showRewarded failed", e);
    }
  },
};
