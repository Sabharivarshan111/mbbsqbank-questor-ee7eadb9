export {};

declare global {
  interface AndroidBridge {
    showRewardedAd?: () => void;
    isRewardedLoaded?: () => boolean;
    isRewardedAdLoaded?: () => boolean;
    isRewardedAdReady?: () => boolean;
    showInterstitialAd?: () => void;
    isInterstitialAdLoaded?: () => boolean;
  }
  interface Window {
    AndroidBridge?: AndroidBridge;
    onRewardedAdCompleted?: (amount: number) => void;
    onRewardedAdDismissed?: () => void;
    onRewardedAdFailed?: () => void;
    onInterstitialAdDismissed?: () => void;
    onInterstitialAdFailed?: () => void;
  }
}
