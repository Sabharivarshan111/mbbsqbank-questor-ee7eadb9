import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface ExamTarget {
  id: string;
  user_id: string;
  year: string;
  subject: string | null;
  exam_date: string;
}

export function useExamTarget(userId: string | null, year: string) {
  const [target, setTarget] = useState<ExamTarget | null>(null);
  const [doneToday, setDoneToday] = useState(0);

  const fetchTarget = useCallback(async () => {
    if (!userId) { setTarget(null); return; }
    const { data } = await supabase
      .from("exam_targets" as any)
      .select("*")
      .eq("user_id", userId)
      .eq("year", year)
      .is("subject", null)
      .maybeSingle();
    setTarget((data as any) ?? null);
  }, [userId, year]);

  const fetchDoneToday = useCallback(async () => {
    if (!userId) { setDoneToday(0); return; }
    const today = format(new Date(), "yyyy-MM-dd");
    const { data } = await supabase
      .from("daily_activity")
      .select("questions_done")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();
    setDoneToday((data?.questions_done as number) ?? 0);
  }, [userId]);

  useEffect(() => {
    fetchTarget();
    fetchDoneToday();
    if (!userId) return;
    const ch = supabase
      .channel(`et:${userId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "exam_targets", filter: `user_id=eq.${userId}` },
        () => fetchTarget())
      .on("postgres_changes",
        { event: "*", schema: "public", table: "daily_activity", filter: `user_id=eq.${userId}` },
        () => fetchDoneToday())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, fetchTarget, fetchDoneToday]);

  const save = useCallback(async (examDate: string) => {
    if (!userId) return;
    await (supabase as any).from("exam_targets").upsert(
      { user_id: userId, year, subject: null, exam_date: examDate },
      { onConflict: "user_id,year,subject" } as any,
    );
    fetchTarget();
  }, [userId, year, fetchTarget]);

  const clear = useCallback(async () => {
    if (!userId || !target) return;
    await supabase.from("exam_targets" as any).delete().eq("id", target.id);
    setTarget(null);
  }, [userId, target]);

  return { target, doneToday, save, clear };
}

/** Computes days remaining (>=0), questions/day target, today's remaining count. */
export function deriveDailyTarget(opts: {
  examDateISO: string | null | undefined;
  totalQuestions: number;
  completedQuestions: number;
  doneToday: number;
}) {
  const { examDateISO, totalQuestions, completedQuestions, doneToday } = opts;
  if (!examDateISO) return null;
  const exam = new Date(examDateISO + "T23:59:59");
  const now = new Date();
  const days = Math.max(1, Math.ceil((exam.getTime() - now.getTime()) / 86400000));
  const remaining = Math.max(0, totalQuestions - completedQuestions);
  const perDay = remaining === 0 ? 0 : Math.ceil(remaining / days);
  const leftToday = Math.max(0, perDay - doneToday);
  return { daysLeft: days, perDay, leftToday, remaining };
}
