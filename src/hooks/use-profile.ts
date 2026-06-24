import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Year } from "@/lib/year-subjects";
import { validateDisplayName } from "@/lib/profanity";
import { syncLocalProgressToCloud, reconcileProgressWithCloud } from "@/lib/question-progress";

export interface LocalProfile {
  display_name: string;
  year: Year;
}

const LS_KEY = "orbit-profile-v1";
const DEVICE_KEY = "orbit-device-id";

function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = (crypto as any).randomUUID ? (crypto as any).randomUUID() : `dev-${Math.random().toString(36).slice(2)}-${Date.now()}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return `dev-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  }
}

function readLocal(): LocalProfile | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as LocalProfile) : null;
  } catch {
    return null;
  }
}

const PROFILE_EVENT = "orbit-profile-changed";

function writeLocal(p: LocalProfile) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(p));
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent(PROFILE_EVENT, { detail: p }));
  } catch {}
}

export class DisplayNameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DisplayNameError";
  }
}

export interface CloudProfile extends LocalProfile {
  id: string;
  xp: number;
  streak: number;
  last_active_date: string | null;
}

export function useProfile() {
  const [local, setLocal] = useState<LocalProfile | null>(readLocal);
  const [cloud, setCloud] = useState<CloudProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
  const [email, setEmail] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(!readLocal());
  const [loading, setLoading] = useState(false);

  // Watch auth
  useEffect(() => {
    const apply = (session: any) => {
      const user = session?.user;
      setUserId(user?.id ?? null);
      setEmail(user?.email ?? null);
      setIsAnonymous(!!user?.is_anonymous);
      // As soon as we know there's a real (non-anonymous) user, don't pop
      // onboarding — the cloud-load effect will hydrate name/year shortly.
      if (user?.id && !user?.is_anonymous) {
        setNeedsOnboarding(false);
      }
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => apply(session));
    return () => sub.subscription.unsubscribe();
  }, []);


  // Sync local profile across all useProfile() instances
  useEffect(() => {
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<LocalProfile>).detail;
      if (detail) setLocal(detail);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY) {
        const next = readLocal();
        if (next) setLocal(next);
      }
    };
    window.addEventListener(PROFILE_EVENT, onCustom);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PROFILE_EVENT, onCustom);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Realtime: own profile row changes
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`own-profile:${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        (payload: any) => {
          const row = payload.new;
          if (!row) return;
          setCloud((c) => (c ? { ...c, ...row } : (row as CloudProfile)));
          const next = { display_name: row.display_name, year: row.year as Year };
          setLocal(next);
          writeLocal(next);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Load cloud profile + register open. Re-runs on every auth change, including
  // anonymous → email/Google sign-in, so the second device adopts the existing
  // account's name/year instead of keeping the throwaway onboarding values.
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, year, xp, streak, last_active_date")
        .eq("id", userId)
        .maybeSingle();
      if (data) {
        setCloud(data as CloudProfile);
        // If this is a real (non-anonymous) account, the cloud profile is the
        // source of truth — replace anything the user just typed in onboarding.
        const next = { display_name: data.display_name, year: data.year as Year };
        setLocal(next);
        writeLocal(next);
        setNeedsOnboarding(false);
      } else if (!readLocal() && isAnonymous) {
        // Only pop onboarding when both the cloud row AND local profile are
        // missing AND we're still anonymous. A signed-in user with no cloud
        // row yet (e.g. just verified email) should NOT see onboarding.
        setNeedsOnboarding(true);
      }

      const { data: openRes } = await (supabase as any).rpc("register_open");
      const openRow = Array.isArray(openRes) ? openRes[0] : openRes;
      if (openRow && typeof openRow.streak === "number") {
        setCloud((c) => c ? { ...c, streak: openRow.streak, last_active_date: openRow.last_active_date } : c);
      }
      // Push any locally-completed questions to the cloud, then merge the cloud
      // set back into localStorage. Reconcile is non-destructive — it never
      // deletes questions ticked on another device.
      await syncLocalProgressToCloud();
      reconcileProgressWithCloud(true);
    })();
  }, [userId, isAnonymous]);

  // Reconcile when the tab becomes visible again (debounced inside the helper)
  useEffect(() => {
    if (!userId) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") reconcileProgressWithCloud();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [userId]);

  const saveProfile = useCallback(
    async (p: LocalProfile) => {
      const check = validateDisplayName(p.display_name);
      if (!check.ok) {
        throw new DisplayNameError(check.reason ?? "Invalid name.");
      }

      setLoading(true);
      try {
        const cleanName = p.display_name.trim();
        const cleanProfile = { display_name: cleanName, year: p.year };
        writeLocal(cleanProfile);
        setLocal(cleanProfile);
        setNeedsOnboarding(false);

        // Ensure anonymous session
        let uid = userId;
        if (!uid) {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) {
            console.warn("Anonymous auth disabled:", error.message);
            setLoading(false);
            return;
          }
          uid = data.user?.id ?? null;
          setUserId(uid);
        }

        if (uid) {
          const deviceId = getDeviceId();
          // Claim/merge any previous profile on this device, then upsert.
          const { data: merged, error: mergeErr } = await (supabase as any).rpc(
            "claim_or_merge_profile",
            {
              _device_id: deviceId,
              _display_name: cleanName,
              _year: p.year,
            }
          );
          if (mergeErr) {
            // Fallback: plain upsert
            await supabase.from("profiles").upsert({
              id: uid,
              display_name: cleanName,
              year: p.year,
              device_id: deviceId,
            });
          }
          const profileRow = merged ?? (
            await supabase
              .from("profiles")
              .select("id, display_name, year, xp, streak, last_active_date")
              .eq("id", uid)
              .maybeSingle()
          ).data;
          if (profileRow) setCloud(profileRow as CloudProfile);
          const { data: openRes2 } = await (supabase as any).rpc("register_open");
          const openRow2 = Array.isArray(openRes2) ? openRes2[0] : openRes2;
          if (openRow2 && typeof openRow2.streak === "number") {
            setCloud((c) => c ? { ...c, streak: openRow2.streak, last_active_date: openRow2.last_active_date } : c);
          }
          await syncLocalProgressToCloud();
          reconcileProgressWithCloud(true);
        }
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setCloud(null);
    setUserId(null);
    setEmail(null);
    setIsAnonymous(true);
  }, []);

  return {
    local,
    cloud,
    userId,
    email,
    isAnonymous,
    needsOnboarding,
    loading,
    saveProfile,
    setNeedsOnboarding,
    signOut,
  };
}
