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
        if (!error && data) setRows(data as WeeklyRow[]);
        setLoading(false);
      }
    };

    fetchRows();

    const channel = supabase
      .channel("weekly-leaderboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "weekly_xp" }, () => fetchRows())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchRows())
      .on("postgres_changes", { event: "*", schema: "public", table: "question_progress" }, () => fetchRows())
      .subscribe();

    const onLocal = () => { setTimeout(fetchRows, 400); };
    window.addEventListener(QUESTION_PROGRESS_EVENT, onLocal);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      window.removeEventListener(QUESTION_PROGRESS_EVENT, onLocal);
    };
  }, [filterYear, enabled]);

  return { rows, loading };
}
