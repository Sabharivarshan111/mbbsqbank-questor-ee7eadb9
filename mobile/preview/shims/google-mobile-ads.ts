/**
 * AdMob is a native module with no web implementation. The preview harness
 * never serves ads, so this stub keeps the bundle resolvable and reports that
 * nothing is loaded.
 */
const noop = () => undefined;

export const TestIds = { INTERSTITIAL: 'test-interstitial', REWARDED: 'test-rewarded' };

export const AdEventType = { LOADED: 'loaded', CLOSED: 'closed', ERROR: 'error' };
export const RewardedAdEventType = { LOADED: 'rewarded_loaded', EARNED_REWARD: 'earned_reward' };

const stubAd = {
  addAdEventListener: () => noop,
  load: noop,
  show: noop,
};

export const InterstitialAd = { createForAdRequest: () => stubAd };
export const RewardedAd = { createForAdRequest: () => stubAd };

export const AdsConsent = {
  async requestInfoUpdate() {
    return { isConsentFormAvailable: false, status: 'NOT_REQUIRED' };
  },
  async showForm() {},
};

export default function mobileAds() {
  return { async initialize() {} };
}
