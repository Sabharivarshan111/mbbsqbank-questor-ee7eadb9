## Root cause: first "My Progress" tap shows no ad

Rewarded ads work like this on Android:
1. You must **load** the ad (`RewardedAd.load(...)`) — takes a few seconds over network.
2. Only when it's fully loaded can `.show()` actually display anything.

Current `AdService.showRewarded()` calls `window.AndroidBridge.showRewardedAd()` **directly**, with no preload. So:

- **1st tap on Progress** → native side receives `showRewardedAd()`, sees no ad loaded, starts loading one, returns silently. Nothing is shown.
- Ad finishes loading ~2–5s later and sits in memory.
- **2nd tap on Progress** → ad is ready, so it plays.

That's exactly the "shows only the second time" behavior you're seeing. Same bug will hit theme-apply if we don't fix it first.

## Fix

**1. Add a preload path in `src/lib/ad-service.ts`:**
- New `preloadRewarded()` — tells the Android wrapper to start loading an ad now.
- New `isRewardedReady()` — checks a bridge flag before calling show.
- `showRewarded()` becomes: if ready → show; else → call `preloadRewarded()` and skip this trigger (so we never "consume" a trigger with a blank screen). Immediately after any show/dismiss, call `preloadRewarded()` again so the next trigger is instant.
- Call `AdService.preloadRewarded()` once at app boot (in `src/App.tsx`) so the very first Progress tap has an ad ready.

**2. Extend the bridge contract in `src/types/android-bridge.d.ts`:**
```ts
interface AndroidBridge {
  showRewardedAd?: () => void;
  loadRewardedAd?: () => void;      // NEW — start loading
  isRewardedAdReady?: () => boolean; // NEW — sync ready check
}
window.onRewardedAdLoaded?: () => void;    // NEW — native pings JS when load finishes
window.onRewardedAdDismissed?: () => void; // NEW — native pings JS on close, so we can preload next
```
Web build stays a safe no-op (all optional).

**Native wrapper change you'll need to add (Android side):**
- `loadRewardedAd()` → `RewardedAd.load(context, AD_UNIT_ID, request, callback)` that stores the loaded ad in a field and calls `webView.evaluateJavascript("window.onRewardedAdLoaded && onRewardedAdLoaded()")`.
- `isRewardedAdReady()` → returns `loadedAd != null`.
- `showRewardedAd()` → if `loadedAd != null`, show it; in the `onAdDismissedFullScreenContent` callback, null it out and call `window.onRewardedAdDismissed()`.
- Add `@JavascriptInterface` on all three.

Until the native side ships these two new methods, JS falls back to the current behavior (still calls `showRewardedAd()` directly), so nothing breaks.

## Add the same rewarded ad to theme apply

Same `AdService.showRewarded()` call, wired into the two places you asked for:

- **`src/components/theme/ThemeToggle.tsx` → `handleApply()`** — fires when user picks a built-in theme (Dark / Light / Blackpink / Liquid Glass / My Theme) and clicks **Apply**.
- **`src/components/theme/CustomThemeDialog.tsx` → `apply()`** — fires when user clicks **Apply Theme** inside *Create Your Own*.

Guardrails already in `AdService`:
- 90-second cooldown (won't spam users who fiddle with themes).
- Skips silently in browser/Lovable preview.
- Only runs when `AndroidBridge` is present.

**Not touched:**
- Rewarded ad on Progress tab & Quiz finish — unchanged.
- Revert button — no ad (per your earlier "annoy previewers" concern; only Apply counts).
- Essays / Short Notes tabs — no ad code goes near them.

## Files to change

- `src/lib/ad-service.ts` — add preload + ready check + auto re-preload.
- `src/types/android-bridge.d.ts` — expand type declarations.
- `src/App.tsx` — one-time `AdService.preloadRewarded()` on mount.
- `src/components/theme/ThemeToggle.tsx` — call in `handleApply`.
- `src/components/theme/CustomThemeDialog.tsx` — call in `apply`.

Reply **go** to implement.