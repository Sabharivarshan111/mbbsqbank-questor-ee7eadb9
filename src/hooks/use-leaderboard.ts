import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Year } from "@/lib/year-subjects";
import { QUESTION_PROGRESS_EVENT } from "@/lib/question-progress";

export interface LeaderRow {
  id: string;
  display_name: string;
  year: Year;
  xp: number;       // lifetime
  year_xp: number;  // questions solved for this year (= xp when "all")
  streak: number;
  year_seconds: number;

}

export function useLeaderboard(filterYear: Year | "all", enabled: boolean) {
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const fetchRows = async () => {
      setLoading(true);
      if (filterYear === "all") {
        // Read through the security-definer RPC so profile rows stay private.
        const { data } = await (supabase as any).rpc("get_weekly_leaderboard", {
          _year: null,
          _limit: 50,
        });
        if (!cancelled && data) {
          setRows(
            (data as any[])
              .map((r) => ({
                id: r.id,
                display_name: r.display_name,
                year: r.year as Year,
                xp: r.xp,
                year_xp: r.xp,
                streak: r.streak,
                year_seconds: Number(r.year_seconds ?? 0),
              }))
              .sort((a, b) => b.xp - a.xp || b.streak - a.streak)
          );
        }
      } else {
        const { data, error } = await (supabase as any).rpc("get_year_leaderboard", {
          _year: filterYear,
          _limit: 50,
        });
        if (!cancelled && !error && data) {
          setRows(
            (data as any[]).map((r) => ({
              id: r.id,
              display_name: r.display_name,
              year: r.year as Year,
              xp: r.xp,
              year_xp: r.year_xp,
              streak: r.streak,
              year_seconds: Number(r.year_seconds ?? 0),

            }))
          );
        }
      }
      setLoading(false);
    };

    fetchRows();

    const channel = supabase
      .channel("leaderboard-profiles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => fetchRows()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "question_progress" },
        () => fetchRows()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "screen_time" },
        () => fetchRows()
      )
      .subscribe();


    const onLocal = () => { setTimeout(fetchRows, 400); setTimeout(fetchRows, 1500); };
    window.addEventListener(QUESTION_PROGRESS_EVENT, onLocal);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      window.removeEventListener(QUESTION_PROGRESS_EVENT, onLocal);
    };
  }, [filterYear, enabled]);

  return { rows, loading };
}
