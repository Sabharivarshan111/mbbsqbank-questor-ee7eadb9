import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Year } from "@/lib/year-subjects";

export interface LeaderRow {
  id: string;
  display_name: string;
  year: Year;
  xp: number;
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
      let q = supabase
        .from("profiles")
        .select("id, display_name, year, xp, streak")
        .order("xp", { ascending: false })
        .limit(50);
      if (filterYear !== "all") q = q.eq("year", filterYear);
      const { data } = await q;
      if (!cancelled && data) setRows(data as LeaderRow[]);
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
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [filterYear, enabled]);

  return { rows, loading };
}
