Root cause found:

1. The app now has two ad wrappers:
   - `src/services/AndroidAds.ts` is Promise-based and used by My Progress.
   - `src/lib/ad-service.ts` is older callback/no-op style and still used by theme apply, custom theme apply, and quiz completion.
   This creates inconsistent behavior.

2. `AndroidAds.ts` currently blocks the ad if `isRewardedLoaded()` returns false. If the Android wrapper has not preloaded yet, the first tap silently returns `not-loaded`, so no ad appears.

3. The My Progress ad is triggered from the tab `onValueChange`, so it only runs when the tab value changes. If the user is already on the Progress tab, or if the tab is opened by walkthrough/event code, tapping/arriving may not trigger another ad.

4. There is a 90-second cooldown. If one rewarded ad fires elsewhere, Progress can be skipped until the cooldown ends, which makes it look broken during testing.

Plan to fix:

1. Make `src/services/AndroidAds.ts` the only source of truth.
   - Keep the Promise API.
   - Support multiple Android bridge method names safely:
     - `isRewardedLoaded()`
     - `isRewardedAdLoaded()`
     - `isRewardedAdReady()`
     - `showRewardedAd()`
   - Add console diagnostics that say exactly why an ad did or did not show: no bridge, not loaded, cooldown, callback completed, dismissed, failed, timeout.

2. Remove silent first-tap failure.
   - If native says the rewarded ad is not loaded, retry readiness for a short window before returning `not-loaded`.
   - Do not burn cooldown for `not-loaded` or failed ads.
   - Keep browser mock behavior for Lovable preview testing.

3. Fix My Progress trigger.
   - Create a single `handleProgressAd()` function in `QuestionBank.tsx`.
   - Call it when the user selects the Progress tab.
   - Also call it when the `orbit:set-tab` event opens Progress, so guided/walkthrough navigation works too.
   - Add a small per-session “opening guard” only to prevent duplicate calls from the same click/event, not to block future valid taps.

4. Update theme/custom theme/quiz ads to use the same Promise-based service.
   - Replace remaining `AdService.showRewarded()` calls in:
     - `ThemeToggle.tsx`
     - `CustomThemeDialog.tsx`
     - `QuizSession.tsx`
   - Use placement names like `theme-apply`, `custom-theme`, and `quiz-complete` so one placement does not unexpectedly block another during testing.

5. Keep compatibility with existing imports.
   - Either remove old `AdService` usage or make `src/lib/ad-service.ts` delegate to `src/services/AndroidAds.ts` so future code cannot accidentally use the wrong bridge.

6. Update TypeScript bridge types.
   - Add optional aliases for the readiness methods and callbacks so the app matches what Android Studio may expose.

Prompt to paste into Google AI Studio / Android Studio AI:

```text
You are integrating AdMob Rewarded Ads into an Android WebView/Capacitor wrapper for a React web app.

Expose this JavaScript bridge to the web app as `window.AndroidBridge`:

1. `showRewardedAd()`
   - Must run on the Android UI thread.
   - If a rewarded ad is loaded, show it immediately.
   - If no rewarded ad is loaded, call `window.onRewardedAdFailed()` from the WebView.
   - After the ad is shown, immediately preload the next rewarded ad when the current ad closes or fails.

2. `isRewardedLoaded()`
   - Return true only when the rewarded ad object is non-null and ready to show.
   - Return false while loading or after it has been consumed.

3. Reward callbacks into the WebView:
   - When the user earns the reward, call:
     `window.onRewardedAdCompleted(amount)`
     Use amount `1` if no reward amount is configured.
   - When the ad is closed without reward, call:
     `window.onRewardedAdDismissed()`
   - When the ad fails to show/load, call:
     `window.onRewardedAdFailed()`

4. Important lifecycle rules:
   - Load the first rewarded ad during Activity/WebView startup.
   - Load the next rewarded ad after every completed, dismissed, or failed show.
   - Do not wait for the web app to call a load method; the web app only calls `isRewardedLoaded()` and `showRewardedAd()`.
   - Add Android Logcat logs for: load start, load success, load fail, show called, reward earned, dismissed, show failed.

5. Also expose interstitial methods if available:
   - `showInterstitialAd()`
   - `isInterstitialAdLoaded()`
   - callbacks: `window.onInterstitialAdDismissed()` and `window.onInterstitialAdFailed()`.

The React app will call:
`const result = await showRewardedAd("progress")`
and will unlock progress only when `result.completed === true`.
```

After implementation, test on Android with Logcat open and verify these logs:
- bridge exists in WebView
- rewarded load success before tapping My Progress
- `showRewardedAd()` called when tapping My Progress
- `onRewardedAdCompleted(1)` is fired after watching the ad
- next rewarded ad starts loading immediately after close/fail.