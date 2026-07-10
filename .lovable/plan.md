## Root cause

The native Android wrapper (from your AI Studio snippet) exposes:

- `AndroidBridge.showInterstitialAd()` / `isInterstitialAdLoaded()`
- `AndroidBridge.showRewardedAd()` / `isRewardedLoaded()`  ← note: **`isRewardedLoaded`**, not `isRewardedAdReady`
- Callbacks: `window.onRewardedAdCompleted(amount)`, `window.onRewardedAdDismissed()`, `window.onRewardedAdFailed()`

Our current `src/lib/ad-service.ts` calls names that **do not exist** on this bridge:

- `bridge.loadRewardedAd()` — not implemented → preload never happens
- `bridge.isRewardedAdReady()` — not implemented → readiness gate never opens
- `window.onRewardedAdLoaded` / `onRewardedAdFailedToLoad` — never fired

So on the first "My Progress" tap:
1. `preloadRewarded()` tries to call `loadRewardedAd` → missing → returns silently, `loadInFlight` stays false forever.
2. `showRewarded()` checks `hasExplicitReadyCheck()` → false (method missing) → falls through and calls `showRewardedAd()` directly.
3. But the native side loads its own ad lazily on `showRewardedAd()`, so the first tap kicks off a load and shows nothing. Second tap finds the ad ready → shows.

Fix = make `AdService` speak the exact API the native wrapper actually exposes.

## Changes

### 1. `src/types/android-bridge.d.ts`
Replace with the real surface:
```ts
interface AndroidBridge {
  showRewardedAd?: () => void;
  isRewardedLoaded?: () => boolean;
  showInterstitialAd?: () => void;
  isInterstitialAdLoaded?: () => boolean;
}
interface Window {
  AndroidBridge?: AndroidBridge;
  onRewardedAdCompleted?: (amount: number) => void;
  onRewardedAdDismissed?: () => void;
  onRewardedAdFailed?: () => void;
}
```
Drop the fictional `loadRewardedAd`, `isRewardedAdReady`, `onRewardedAdLoaded`, `onRewardedAdFailedToLoad`.

### 2. `src/lib/ad-service.ts` — rewrite around the real bridge
- `isRewardedReady()` → call `AndroidBridge.isRewardedLoaded()`.
- Remove `preloadRewarded()` calls to `loadRewardedAd` (native has no such method — it auto-preloads after each show). Keep `preloadRewarded()` as a no-op export so existing callers (`App.tsx`) don't break.
- `showRewarded(onReward, placement)`:
  1. If not native → skip.
  2. If `withinCooldown(placement)` → skip.
  3. If `isRewardedLoaded()` is false → skip this tap (native is still loading); do NOT mark cooldown, so next tap retries.
  4. Wire fresh one-shot `window.onRewardedAdCompleted` / `onRewardedAdDismissed` / `onRewardedAdFailed` handlers exactly like the AI Studio snippet (unique per call, cleaned up on any terminal event). Only mark cooldown on Completed or Dismissed — not on Failed.
  5. Call `AndroidBridge.showRewardedAd()`.
- Keep the per-placement cooldown (`orbit:ad:lastRewardedShownAt:v2:<placement>`) so theme ads don't block Progress.

### 3. `src/App.tsx`
`AdPreloader` becomes a no-op (or we remove the retries) — native handles preloading internally, so the JS-side timers and focus/visibility handlers are noise. Keep the component mounted but empty to avoid churn elsewhere.

### 4. Callers stay unchanged
- `QuestionBank.tsx`: `AdService.showRewarded(undefined, "progress")` still valid.
- `ThemeToggle.tsx` Apply: `AdService.showRewarded()` still valid.
- `CustomThemeDialog.tsx` apply: `AdService.showRewarded()` still valid.

### 5. Not touched
- Interstitials — you didn't ask to wire any triggers yet. The type is added so we can add `AdService.showInterstitial()` later if you want.
- Essays / Short Notes / Revert — no ads there.

## Result

First "My Progress" tap: if the native ad is already loaded (usual case within a couple seconds of app open) → shows immediately. If not loaded yet → silently skipped, no cooldown burned, next tap shows it. No more "shows only on second tap" once the native side has completed its first preload.

## Native-side requirement

Your Android wrapper must, after every rewarded ad finishes/dismisses/fails, immediately call `loadRewardedAd()` internally so `isRewardedLoaded()` returns true again quickly. If the native side already does this (the AI Studio snippet implies it does), no Android change is needed.
