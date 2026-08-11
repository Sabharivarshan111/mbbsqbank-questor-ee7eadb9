import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type NotesPlan = "notes_fmspm" | "notes_pharmac";

export const PREMIUM_NOTES_DRIVE_URL =
  "https://drive.google.com/drive/folders/1TbgyHOkdrfYd8-4nl1jTup3LSkkimzvv";

/** "Premium 2nd year" Drive folder — Pharmacology full-subject notes. */
export const PHARMAC_NOTES_DRIVE_URL =
  "https://drive.google.com/drive/folders/1HuMtYbqTnWO-bQ-uGNlrrdCPp6pA4pch";

export const NOTES_DRIVE_URL: Record<NotesPlan, string> = {
  notes_fmspm: PREMIUM_NOTES_DRIVE_URL,
  notes_pharmac: PHARMAC_NOTES_DRIVE_URL,
};

/** Has the signed-in user bought the given notes bundle? */
export function useNotesPurchase(plan: NotesPlan = "notes_fmspm") {
  const [owned, setOwned] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setSignedIn(!!user);
      if (!user) { setOwned(false); return; }
      const { data } = await supabase
        .from("premium_subscriptions")
        .select("expires_at")
        .eq("user_id", user.id)
        .eq("plan", plan)
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const exp = (data as any)?.expires_at ?? null;
      setOwned(!!exp && new Date(exp).getTime() > Date.now());
    } finally {
      setLoading(false);
    }
  }, [plan]);

  useEffect(() => {
    void refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { void refresh(); });
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  return { owned, signedIn, loading, refresh };
}
