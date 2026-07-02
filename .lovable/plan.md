## Goal

Wire native AdMob **Rewarded Ads only** into the web app via the `AndroidBridge` JS interface your Capacitor Android wrapper exposes. No interstitials anywhere. Triggered at two high-intent moments:

1. When the user opens the **"Your Progress"** tab.
2. When the user **completes a quiz** in Quiz Me.

Web / Lovable preview stays fully functional — the fallback is a silent no-op that still lets the user proceed.

---

## Files to add / change

### 1. New: `src/lib/ad-service.ts`
Rewarded-only helper. Nothing else.

- `AdService.showRewarded(onReward?: (amount:number)=>void)` — assigns `window.onRewardedAdCompleted = onReward`, then calls `window.AndroidBridge.showRewardedAd()`. In browser/preview it logs and does nothing (no fake reward, since we're not gating anything on the reward — see behavior matrix).
- `AdService.isNative()` — returns `!!window.AndroidBridge?.showRewardedAd`.
- Wrapped in try/catch so a broken bridge can never crash the UI.
- Cooldown: `sessionStorage` timestamp, default 90s, so tapping "Your Progress" repeatedly won't spam ads.

### 2. `src/components/QuestionBank.tsx`
In the existing `Tabs onValueChange`, when `next === "progress"`, fire `AdService.showRewarded()` (fire-and-forget). Tab switch is never blocked by the ad. All current logic (pomodoro hide event, setActiveTab) stays as is.

### 3. `src/components/progress/QuizSession.tsx`
In `next()`, right **after** `award_quiz_xp` finishes and we set `done = true`, call `AdService.showRewarded()`. Base score is always saved even if the user dismisses the ad. No bonus XP tied to the reward — see open question below if you want that.

### 4. New: `src/types/android-bridge.d.ts`
```ts
interface AndroidBridge {
  showRewardedAd?: () => void;
}
interface Window {
  AndroidBridge?: AndroidBridge;
  onRewardedAdCompleted?: (amount: number) => void;
}
```

---

## Behavior matrix

| Environment | Progress tab tap | Quiz finish |
|---|---|---|
| Android APK (bridge present) | Rewarded ad shown (90s cooldown) | Rewarded ad shown after score is saved |
| Web / Lovable preview | Silent no-op, tab opens normally | Silent no-op, results screen shows normally |

---

## What I will NOT change

- No interstitials. No `showInterstitialAd`, no `isInterstitialAdLoaded`. Just rewarded.
- No routing changes — the app already uses `react-router` throughout.
- No changes to `AdBanner.tsx` (AdSense web banner is unrelated).
- No Capacitor AdMob plugin install — you're using your own Android-side `AndroidBridge`.

---

## Open question before I build

Right now the ad plays but the user gets **nothing extra** for watching — it's pure monetization. Do you want the rewarded ad to actually **reward** the user with something? Common patterns:

- **+5 bonus XP** on quiz finish if they watch to completion (call `award_quiz_xp` a second time inside the reward callback).
- **+1 streak freeze** as an occasional reward.
- **Nothing** — just show the ad (current plan).

Tell me which and I'll wire it in. Otherwise I'll ship the "nothing extra" version by default.