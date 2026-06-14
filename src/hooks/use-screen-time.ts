import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tracks foreground time in the app and flushes it to Supabase every 30s
 * (and on tab hide / unload). Used as the leaderboard tiebreaker.
 */
export function useScreenTime() {
  const accumulatedRef = useRef(0); // seconds not yet sent
  const lastTickRef = useRef<number>(Date.now());
  const visibleRef = useRef<boolean>(typeof document !== "undefined" ? !document.hidden : true);

  useEffect(() => {
    let cancelled = false;

    const flush = async () => {
      const secs = Math.floor(accumulatedRef.current);
      if (secs <= 0) return;
      accumulatedRef.current -= secs;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await (supabase as any).rpc("record_screen_time", { _seconds: secs });
      } catch {
        // put them back if the call failed
        accumulatedRef.current += secs;
      }
    };

    const tick = () => {
      const now = Date.now();
      const delta = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      if (visibleRef.current && delta > 0 && delta < 120) {
        accumulatedRef.current += delta;
      }
    };

    const tickInterval = setInterval(tick, 1000);
    const flushInterval = setInterval(() => { tick(); flush(); }, 30_000);

    const onVis = () => {
      tick();
      visibleRef.current = !document.hidden;
      lastTickRef.current = Date.now();
      if (document.hidden) flush();
    };
    const onUnload = () => { tick(); flush(); };

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      cancelled = true;
      clearInterval(tickInterval);
      clearInterval(flushInterval);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", onUnload);
      tick();
      flush();
    };
  }, []);
}
