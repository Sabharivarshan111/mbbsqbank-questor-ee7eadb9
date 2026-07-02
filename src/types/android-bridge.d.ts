export {};

declare global {
  interface AndroidBridge {
    showRewardedAd?: () => void;
  }
  interface Window {
    AndroidBridge?: AndroidBridge;
    onRewardedAdCompleted?: (amount: number) => void;
  }
}
