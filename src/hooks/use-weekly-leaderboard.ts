import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Year } from "@/lib/year-subjects";
import { QUESTION_PROGRESS_EVENT } from "@/lib/question-progress";

export interface WeeklyRow {
  id: string;
  display_name: string;
  year: Year;
  weekly_xp: number;
  year_xp: number;
  xp: number;
  streak: number;
  weekly_seconds: number;
  year_seconds: number;

}

export function useWeeklyLeaderboard(filterYear: Year | "all", enabled: boolean) {
  const [rows, setRows] = useState<WeeklyRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const fetchRows = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any).rpc("get_weekly_leaderboard", {
        _year: filterYear === "all" ? null : filterYear,
        _limit: 50,
      });
      if (!cancelled) {
        if (!error && data) {
          setRows((data as any[]).map((r) => ({
            id: r.id,
            display_name: r.display_name,
            year: r.year as Year,
            weekly_xp: r.weekly_xp,
            year_xp: r.year_xp,
            xp: r.xp,
            streak: r.streak,
            weekly_seconds: Number(r.weekly_seconds ?? 0),
            year_seconds: Number(r.year_seconds ?? 0),
          })));
        }
        setLoading(false);
      }

    };

    fetchRows();

    const channel = supabase
      .channel("weekly-leaderboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "weekly_xp" }, () => fetchRows())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchRows())
      .on("postgres_changes", { event: "*", schema: "public", table: "question_progress" }, () => fetchRows())
      .on("postgres_changes", { event: "*", schema: "public", table: "screen_time" }, () => fetchRows())
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
