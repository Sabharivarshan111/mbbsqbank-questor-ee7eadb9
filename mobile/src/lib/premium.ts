import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

/**
 * Ad-free (premium) state, ported from src/hooks/use-premium.ts.
 *
 * The ad layer needs a *synchronous* answer — it decides whether to prompt
 * before any await is possible — but AsyncStorage is async. So the expiry is
 * held in memory, hydrated once at launch and refreshed whenever the session
 * or foreground state changes.
 *
 * The storage key matches the web app's, so a user who paid on the web is
 * ad-free in the native app without buying again.
 */

const STORAGE_KEY = 'orbit:premium-until';

let expiresAt: string | null = null;

/** Synchronous check used by the ad layer. */
export function isPremiumCached(): boolean {
  if (!expiresAt) {
    return false;
  }
  return new Date(expiresAt).getTime() > Date.now();
}

export function premiumExpiresAt(): string | null {
  return isPremiumCached() ? expiresAt : null;
}

async function cache(value: string | null): Promise<void> {
  expiresAt = value;
  try {
    if (value) {
      await AsyncStorage.setItem(STORAGE_KEY, value);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // In-memory value still applies for this session.
  }
}

/** Load the last known expiry so the first ad check is correct offline. */
export async function hydratePremium(): Promise<void> {
  try {
    expiresAt = await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    expiresAt = null;
  }
}

/**
 * Refresh the expiry from the server. Safe to call from anywhere; a failure
 * leaves the cached value alone rather than silently un-premiuming a paying
 * user because the network was down.
 */
export async function syncPremiumCache(): Promise<string | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) {
      // Signed out — no entitlement to speak of.
      await cache(null);
      return null;
    }

    const { data, error } = await supabase
      .from('premium_subscriptions')
      .select('expires_at')
      .eq('user_id', userId)
      .eq('plan', 'adfree_monthly')
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      // Keep whatever was cached; do not punish a paying user for a bad request.
      return premiumExpiresAt();
    }

    const expiry = (data as { expires_at?: string } | null)?.expires_at ?? null;
    const active = !!expiry && new Date(expiry).getTime() > Date.now();
    await cache(active ? expiry : null);
    return active ? expiry : null;
  } catch {
    return premiumExpiresAt();
  }
}

/**
 * Mount once at the app root so the ad layer always knows about paid users.
 * Refreshes on sign-in/out and whenever the app returns to the foreground —
 * the native equivalent of the web version's visibilitychange listener.
 */
export function usePremiumSync(): void {
  useEffect(() => {
    syncPremiumCache().catch(() => undefined);

    const { data: authSub } = supabase.auth.onAuthStateChange(() => {
      syncPremiumCache().catch(() => undefined);
    });

    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        syncPremiumCache().catch(() => undefined);
      }
    };
    const appSub = AppState.addEventListener('change', onAppState);

    return () => {
      authSub.subscription.unsubscribe();
      appSub.remove();
    };
  }, []);
}
