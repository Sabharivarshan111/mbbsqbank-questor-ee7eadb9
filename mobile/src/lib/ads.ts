import mobileAds, {
  AdEventType,
  AdsConsent,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

/**
 * AdMob wiring.
 *
 * Live unit IDs are only used in release builds. Development serves Google's
 * test units instead — impressions or clicks on your own live ads during
 * development are policy violations and can get the AdMob account suspended.
 *
 * The app ID itself lives in app.json under `react-native-google-mobile-ads`;
 * the library's Gradle script reads it from there and injects the manifest
 * meta-data, so it must not also be declared in AndroidManifest.xml.
 */

const INTERSTITIAL_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : 'ca-app-pub-3177287525203129/7425202639';

const REWARDED_UNIT_ID = __DEV__
  ? TestIds.REWARDED
  : 'ca-app-pub-3177287525203129/6765465304';

export interface RewardedResult {
  completed: boolean;
  amount: number;
}

let initialized = false;
let interstitial: InterstitialAd | null = null;
let rewarded: RewardedAd | null = null;
let interstitialLoaded = false;
let rewardedLoaded = false;

/**
 * Ask for consent (required in the EEA/UK) and start the SDK. Safe to call
 * more than once; failures are swallowed so ads never block the app.
 */
export async function initializeAds(): Promise<void> {
  if (initialized) {
    return;
  }
  initialized = true;

  try {
    // Google requires a UMP consent flow before serving personalised ads.
    const consentInfo = await AdsConsent.requestInfoUpdate();
    if (consentInfo.isConsentFormAvailable && consentInfo.status === 'REQUIRED') {
      await AdsConsent.showForm();
    }
  } catch (error) {
    // No consent form, or the user is outside a consent region.
    console.warn('Ads consent flow skipped:', error);
  }

  try {
    await mobileAds().initialize();
    preloadInterstitial();
    preloadRewarded();
  } catch (error) {
    console.warn('Ads initialization failed:', error);
    initialized = false;
  }
}

function preloadInterstitial(): void {
  try {
    interstitialLoaded = false;
    interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_UNIT_ID);
    interstitial.addAdEventListener(AdEventType.LOADED, () => {
      interstitialLoaded = true;
    });
    interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      // A unit can only be shown once, so build a fresh one for next time.
      preloadInterstitial();
    });
    interstitial.addAdEventListener(AdEventType.ERROR, () => {
      interstitialLoaded = false;
    });
    interstitial.load();
  } catch (error) {
    console.warn('Interstitial preload failed:', error);
  }
}

function preloadRewarded(): void {
  try {
    rewardedLoaded = false;
    rewarded = RewardedAd.createForAdRequest(REWARDED_UNIT_ID);
    rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      rewardedLoaded = true;
    });
    rewarded.addAdEventListener(AdEventType.ERROR, () => {
      rewardedLoaded = false;
    });
    rewarded.load();
  } catch (error) {
    console.warn('Rewarded preload failed:', error);
  }
}

export function isRewardedReady(): boolean {
  return rewardedLoaded;
}

export function isInterstitialReady(): boolean {
  return interstitialLoaded;
}

/**
 * Plays a rewarded ad and resolves once it closes. Resolves
 * `{ completed: false }` rather than rejecting when no ad is available, so
 * callers never have to gate on ad success.
 */
export function showRewardedAd(): Promise<RewardedResult> {
  return new Promise(resolve => {
    if (!rewarded || !rewardedLoaded) {
      // Nothing loaded — take the chance to warm one up for next time.
      preloadRewarded();
      resolve({ completed: false, amount: 0 });
      return;
    }

    let earned = 0;
    let settled = false;
    const finish = (result: RewardedResult) => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };

    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      reward => {
        earned = reward.amount;
      },
    );
    const unsubscribeClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      unsubscribeEarned();
      unsubscribeClosed();
      finish({ completed: earned > 0, amount: earned });
      preloadRewarded();
    });

    try {
      rewarded.show();
    } catch (error) {
      console.warn('Rewarded show failed:', error);
      unsubscribeEarned();
      unsubscribeClosed();
      finish({ completed: false, amount: 0 });
      preloadRewarded();
    }
  });
}

export function showInterstitialAd(): void {
  if (!interstitial || !interstitialLoaded) {
    preloadInterstitial();
    return;
  }
  try {
    interstitial.show();
  } catch (error) {
    console.warn('Interstitial show failed:', error);
    preloadInterstitial();
  }
}
