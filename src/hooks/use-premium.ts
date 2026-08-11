import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const LS_KEY = "orbit:premium-until";

/** Synchronous check used by the ad layer (no await available there). */
export function isPremiumCached(): boolean {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    return new Date(raw).getTime() > Date.now();
  } catch {
    return false;
  }
}

function cache(expiresAt: string | null) {
  try {
    if (expiresAt) localStorage.setItem(LS_KEY, expiresAt);
    else localStorage.removeItem(LS_KEY);
  } catch { /* ignore */ }
}

/**
 * Fetch the ad-free expiry for the signed-in user and write it into the cache
 * the ad layer reads. Safe to call from anywhere (app boot, after a purchase).
 */
export async function syncPremiumCache(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { cache(null); return null; }
    const { data } = await supabase
      .from("premium_subscriptions")
      .select("expires_at")
      .eq("user_id", user.id)
      .eq("plan", "adfree_monthly")
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const exp = (data as any)?.expires_at ?? null;
    const active = !!exp && new Date(exp).getTime() > Date.now();
    cache(active ? exp : null);
    return active ? exp : null;
  } catch {
    return null;
  }
}

/** Mount once at app root so the ad layer always knows about paid users. */
export function PremiumSync() {
  useEffect(() => {
    void syncPremiumCache();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { void syncPremiumCache(); });
    const onVisible = () => { if (document.visibilityState === "visible") void syncPremiumCache(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      sub.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}

/** Ad-free subscription state for the signed-in user. */
export function usePremium() {
  const [premium, setPremium] = useState<boolean>(isPremiumCached);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const exp = await syncPremiumCache();
      setExpiresAt(exp);
      setPremium(!!exp);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { void refresh(); });
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  return { premium, expiresAt, loading, refresh };
}
