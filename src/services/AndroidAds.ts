// Promise-based wrapper around the native Android AdMob bridge.
// In the browser (no AndroidBridge), ads are simulated with short timers so
// the app remains testable in Lovable preview / desktop.
//
// Native surface expected on `window.AndroidBridge`:
//   showRewardedAd()            -> void
//   isRewardedLoaded()          -> boolean
//   showInterstitialAd()        -> void
//   isInterstitialAdLoaded()    -> boolean
// Native fires these window callbacks:
//   window.onRewardedAdCompleted(amount:number)
//   window.onRewardedAdDismissed()
//   window.onRewardedAdFailed()
//   window.onInterstitialAdDismissed?()
//   window.onInterstitialAdFailed?()

export type RewardedResult = {
  completed: boolean;
  amount: number;
  reason?: "dismissed" | "failed" | "not-loaded" | "cooldown" | "completed" | "simulated";
};

export type InterstitialResult = {
  shown: boolean;
  reason?: "dismissed" | "failed" | "not-loaded" | "simulated";
};

const COOLDOWN_MS = 90_000;
const COOLDOWN_PREFIX = "orbit:ad:lastRewardedShownAt:v3";

const now = () => Date.now();
const cooldownKey = (placement: string) => `${COOLDOWN_PREFIX}:${placement}`;

const withinCooldown = (placement: string) => {
  try {
    const raw = sessionStorage.getItem(cooldownKey(placement));
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
    sessionStorage.setItem(cooldownKey(placement), String(now()));
  } catch {
    /* ignore */
  }
};

export const isAndroidBridgeAvailable = (): boolean => {
  try {
    return typeof window !== "undefined" && !!window.AndroidBridge;
  } catch {
    return false;
  }
};

export const isRewardedLoaded = (): boolean => {
  try {
    const b = window.AndroidBridge;
    if (!b) return false;
    if (typeof b.isRewardedLoaded === "function") return !!b.isRewardedLoaded();
    return true; // older wrapper: assume ready
  } catch {
    return false;
  }
};

export const isInterstitialLoaded = (): boolean => {
  try {
    const b = window.AndroidBridge;
    if (!b) return false;
    if (typeof b.isInterstitialAdLoaded === "function") return !!b.isInterstitialAdLoaded();
    return true;
  } catch {
    return false;
  }
};

// --- Browser simulation -----------------------------------------------------

const simulateRewarded = (): Promise<RewardedResult> =>
  new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve({ completed: true, amount: 1, reason: "simulated" });
      return;
    }
    // Tiny non-blocking mock so the flow can be exercised in preview.
    setTimeout(() => {
      console.log("[AndroidAds] (browser mock) rewarded ad completed");
      resolve({ completed: true, amount: 1, reason: "simulated" });
    }, 400);
  });

const simulateInterstitial = (): Promise<InterstitialResult> =>
  new Promise((resolve) => {
    setTimeout(() => resolve({ shown: true, reason: "simulated" }), 300);
  });

// --- Rewarded ---------------------------------------------------------------

let rewardedInFlight: Promise<RewardedResult> | null = null;

export const showRewardedAd = (placement = "default"): Promise<RewardedResult> => {
  if (rewardedInFlight) return rewardedInFlight;

  if (!isAndroidBridgeAvailable()) {
    rewardedInFlight = simulateRewarded().finally(() => {
      rewardedInFlight = null;
    });
    return rewardedInFlight;
  }

  if (withinCooldown(placement)) {
    return Promise.resolve({ completed: false, amount: 0, reason: "cooldown" });
  }

  if (!isRewardedLoaded()) {
    // Don't burn cooldown; user can retry as soon as native reports loaded.
    return Promise.resolve({ completed: false, amount: 0, reason: "not-loaded" });
  }

  rewardedInFlight = new Promise<RewardedResult>((resolve) => {
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ completed: false, amount: 0, reason: "failed" });
    }, 60_000);

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      delete window.onRewardedAdCompleted;
      delete window.onRewardedAdDismissed;
      delete window.onRewardedAdFailed;
    };

    let earnedAmount = 0;

    window.onRewardedAdCompleted = (amount: number) => {
      earnedAmount = typeof amount === "number" ? amount : 1;
      markShown(placement);
      // Wait for dismiss to actually resolve, in case both fire.
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ completed: true, amount: earnedAmount, reason: "completed" });
    };
    window.onRewardedAdDismissed = () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (earnedAmount > 0) {
        markShown(placement);
        resolve({ completed: true, amount: earnedAmount, reason: "completed" });
      } else {
        markShown(placement);
        resolve({ completed: false, amount: 0, reason: "dismissed" });
      }
    };
    window.onRewardedAdFailed = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ completed: false, amount: 0, reason: "failed" });
    };

    try {
      window.AndroidBridge!.showRewardedAd!();
    } catch (e) {
      console.warn("[AndroidAds] showRewardedAd threw", e);
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ completed: false, amount: 0, reason: "failed" });
    }
  }).finally(() => {
    rewardedInFlight = null;
  });

  return rewardedInFlight;
};

// --- Interstitial -----------------------------------------------------------

export const showInterstitialAd = (): Promise<InterstitialResult> => {
  if (!isAndroidBridgeAvailable()) return simulateInterstitial();
  if (!isInterstitialLoaded()) {
    return Promise.resolve({ shown: false, reason: "not-loaded" });
  }
  return new Promise<InterstitialResult>((resolve) => {
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ shown: false, reason: "failed" });
    }, 30_000);
    const cleanup = () => {
      window.clearTimeout(timeoutId);
      delete window.onInterstitialAdDismissed;
      delete window.onInterstitialAdFailed;
    };
    window.onInterstitialAdDismissed = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ shown: true });
    };
    window.onInterstitialAdFailed = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ shown: false, reason: "failed" });
    };
    try {
      window.AndroidBridge!.showInterstitialAd!();
    } catch {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ shown: false, reason: "failed" });
    }
  });
};
