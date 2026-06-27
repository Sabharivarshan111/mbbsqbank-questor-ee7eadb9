import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DueRow {
  question_id: string;
  year: string;
  due_date: string;
  interval_days: number;
  ease: number;
}

export function useRevisionQueue(userId: string | null, year: string) {
  const [due, setDue] = useState<DueRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDue = useCallback(async () => {
    if (!userId) { setDue([]); return; }
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("revision_schedule" as any)
      .select("question_id, year, due_date, interval_days, ease")
      .eq("user_id", userId)
      .eq("year", year)
      .lte("due_date", today)
      .order("due_date", { ascending: true })
      .limit(100);
    setDue(((data as any) || []) as DueRow[]);
    setLoading(false);
  }, [userId, year]);

  useEffect(() => {
    fetchDue();
    if (!userId) return;
    const ch = supabase
      .channel(`rs:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "revision_schedule", filter: `user_id=eq.${userId}` },
        () => fetchDue(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, fetchDue]);

  const grade = useCallback(async (qid: string, g: "again" | "hard" | "good" | "easy") => {
    await (supabase as any).rpc("review_question", { _question_id: qid, _grade: g });
    fetchDue();
  }, [fetchDue]);

  return { due, loading, grade, refetch: fetchDue };
}
