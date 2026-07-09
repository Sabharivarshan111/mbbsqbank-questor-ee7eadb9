export {};

declare global {
  interface AndroidBridge {
    showRewardedAd?: () => void;
    loadRewardedAd?: () => void;
    isRewardedAdReady?: () => boolean;
  }
  interface Window {
    AndroidBridge?: AndroidBridge;
    onRewardedAdCompleted?: (amount: number) => void;
    onRewardedAdLoaded?: () => void;
    onRewardedAdFailedToLoad?: () => void;
    onRewardedAdDismissed?: () => void;
  }
}
