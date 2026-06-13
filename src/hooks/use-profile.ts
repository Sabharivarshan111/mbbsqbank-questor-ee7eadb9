import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Year } from "@/lib/year-subjects";

export interface LocalProfile {
  display_name: string;
  year: Year;
}

const LS_KEY = "orbit-profile-v1";

function readLocal(): LocalProfile | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as LocalProfile) : null;
  } catch {
    return null;
  }
}

function writeLocal(p: LocalProfile) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(p));
  } catch {}
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
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => apply(session));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load cloud profile + register open
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
        setLocal({ display_name: data.display_name, year: data.year as Year });
        writeLocal({ display_name: data.display_name, year: data.year as Year });
      }
      await supabase.rpc("register_open");
    })();
  }, [userId]);

  const saveProfile = useCallback(
    async (p: LocalProfile) => {
      setLoading(true);
      try {
        writeLocal(p);
        setLocal(p);
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
          await supabase.from("profiles").upsert({
            id: uid,
            display_name: p.display_name,
            year: p.year,
          });
          const { data } = await supabase
            .from("profiles")
            .select("id, display_name, year, xp, streak, last_active_date")
            .eq("id", uid)
            .maybeSingle();
          if (data) setCloud(data as CloudProfile);
          await supabase.rpc("register_open");
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
