import {
  isAndroidBridgeAvailable,
  isInterstitialLoaded,
  isRewardedLoaded,
  showInterstitialAd,
  showRewardedAd,
} from "@/services/AndroidAds";

export const AdService = {
  isNative(): boolean {
    return isAndroidBridgeAvailable();
  },

  isRewardedReady(): boolean {
    return isRewardedLoaded();
  },

  isInterstitialReady(): boolean {
    return isInterstitialLoaded();
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
    void showRewardedAd(placement).then((result) => {
      if (result.completed) onReward?.(result.amount);
    });
  },

  /**
   * Trigger a native interstitial ad. Silent no-op in browser / preview.
   */
  showInterstitial(): void {
    void showInterstitialAd();
  },
};
