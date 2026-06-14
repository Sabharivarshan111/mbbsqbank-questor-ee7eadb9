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
        const { data } = await supabase
          .from("profiles")
          .select("id, display_name, year, xp, streak")
          .order("xp", { ascending: false })
          .order("streak", { ascending: false })
          .limit(50);
        if (!cancelled && data) {
          setRows(
            (data as any[]).map((r) => ({
              id: r.id,
              display_name: r.display_name,
              year: r.year as Year,
              xp: r.xp,
              year_xp: r.xp,
              streak: r.streak,
            }))
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
      .subscribe();

    const onLocal = () => fetchRows();
    window.addEventListener(QUESTION_PROGRESS_EVENT, onLocal);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      window.removeEventListener(QUESTION_PROGRESS_EVENT, onLocal);
    };
  }, [filterYear, enabled]);

  return { rows, loading };
}
