// Rewarded-ad-only helper that talks to the native Android wrapper's
// `window.AndroidBridge`. Safe no-op in browser / Lovable preview.

const COOLDOWN_MS = 90_000;
// v2 intentionally ignores the old key because the previous implementation
// could write cooldown even when native had no loaded ad and showed nothing.
const STORAGE_PREFIX = "orbit:ad:lastRewardedShownAt:v2";
const LOAD_TIMEOUT_MS = 15_000;

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

// Track load state on the JS side so we don't re-request while one is inflight.
let loadInFlight = false;
let loadTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingRewardCallback: ((amount: number) => void) | undefined;
let pendingRewardPlacement = "default";

const clearLoadState = () => {
  loadInFlight = false;
  if (loadTimeout) {
    clearTimeout(loadTimeout);
    loadTimeout = null;
  }
};

const wireLoadCallbacks = () => {
  if (typeof window === "undefined") return;
  window.onRewardedAdLoaded = () => {
    clearLoadState();
    console.log("[AdService] Rewarded ad loaded and ready.");
  };
  window.onRewardedAdFailedToLoad = () => {
    clearLoadState();
    console.log("[AdService] Rewarded ad failed to load; will retry later.");
  };
  window.onRewardedAdCompleted = (amount: number) => {
    markShown(pendingRewardPlacement);
    const callback = pendingRewardCallback;
    pendingRewardCallback = undefined;
    if (callback) {
      try {
        callback(amount);
      } catch (e) {
        console.warn("[AdService] onReward callback threw", e);
      }
    }
  };
  window.onRewardedAdDismissed = () => {
    markShown(pendingRewardPlacement);
    pendingRewardCallback = undefined;
    console.log("[AdService] Rewarded ad dismissed; preloading next.");
    AdService.preloadRewarded();
  };
};

const hasExplicitReadyCheck = () => {
  try {
    return typeof window !== "undefined" && typeof window.AndroidBridge?.isRewardedAdReady === "function";
  } catch {
    return false;
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
      loadTimeout = setTimeout(() => {
        clearLoadState();
        console.log("[AdService] Rewarded preload timed out; next trigger may retry.");
      }, LOAD_TIMEOUT_MS);
      console.log("[AdService] Rewarded ad preload requested.");
    } catch (e) {
      clearLoadState();
      console.warn("[AdService] preloadRewarded failed", e);
    }
  },

  /**
   * Trigger a native AdMob Rewarded Ad. Fire-and-forget.
   * `onReward` is invoked from the Android side via
   * `window.onRewardedAdCompleted(amount)` when the user finishes watching.
   * In browser / preview this is a silent no-op.
   */
  showRewarded(onReward?: (amount: number) => void, placement = "default"): void {
    try {
      if (!AdService.isNative()) {
        console.log("[AdService] Rewarded skipped: not running in Android wrapper.");
        return;
      }
      wireLoadCallbacks();
      AdService.preloadRewarded();

      if (withinCooldown(placement)) {
        console.log("[AdService] Rewarded skipped: within cooldown window.");
        return;
      }

      if (hasExplicitReadyCheck() && !AdService.isRewardedReady()) {
        console.log("[AdService] Rewarded not ready; preloading for next trigger.");
        AdService.preloadRewarded();
        return;
      }

      pendingRewardCallback = onReward;
      pendingRewardPlacement = placement;
      window.AndroidBridge!.showRewardedAd!();
      // Kick off the next preload so subsequent triggers are instant.
      setTimeout(() => AdService.preloadRewarded(), 500);
    } catch (e) {
      console.warn("[AdService] showRewarded failed", e);
    }
  },
};
