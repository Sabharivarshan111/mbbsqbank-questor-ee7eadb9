import { useEffect, useRef } from "react";
import { useProfile } from "./use-profile";
import { useCalendarEvents } from "./use-calendar-events";
import { useExamTarget, deriveDailyTarget } from "./use-exam-target";
import { getYearNode } from "@/lib/year-subjects";
import { collectQuestions, countDone } from "@/lib/question-progress";
import {
  ensurePermission,
  scheduleOne,
  cancel,
  calendarNotifId,
  NOTIF_IDS,
  isNotificationsEnabled,
} from "@/lib/notifications";

/**
 * Schedules the four on-device reminders:
 *   - 📌 Calendar events (9:00 AM IST on event date)
 *   - 🎯 Daily target nudge (19:00 IST)
 *   - 🔥 Streak-at-risk (21:00 IST)
 * Re-runs on app open, calendar changes, and every 30 min.
 */
export function useNotificationSync() {
  const { userId, local, cloud } = useProfile();
  const year = local?.year ?? "first";
  const { events } = useCalendarEvents(userId);
  const { target, doneToday } = useExamTarget(userId, year);
  const lastCalendarIdsRef = useRef<number[]>([]);

  // Ask for permission once per session
  useEffect(() => {
    if (!isNotificationsEnabled()) return;
    ensurePermission();
  }, []);

  // Calendar event reminders — 9:00 AM IST on the event date
  useEffect(() => {
    if (!isNotificationsEnabled() || !userId) return;
    let cancelled = false;
    (async () => {
      // cancel previously scheduled calendar ids
      if (lastCalendarIdsRef.current.length) {
        await cancel(lastCalendarIdsRef.current);
        lastCalendarIdsRef.current = [];
      }
      const now = Date.now();
      const horizon = now + 14 * 24 * 60 * 60 * 1000;
      const next: number[] = [];
      for (const ev of events) {
        // 9:00 AM IST = 03:30 UTC
        const [y, m, d] = ev.event_date.split("-").map(Number);
        if (!y || !m || !d) continue;
        const at = new Date(Date.UTC(y, m - 1, d, 3, 30, 0));
        if (at.getTime() < now || at.getTime() > horizon) continue;
        const id = calendarNotifId(ev.id);
        next.push(id);
        if (cancelled) return;
        await scheduleOne({
          id,
          title: ev.important ? "📌 Important today" : "📅 Reminder",
          body: ev.title,
          at,
        });
      }
      lastCalendarIdsRef.current = next;
    })();
    return () => {
      cancelled = true;
    };
  }, [events, userId]);

  // Daily-target + streak-at-risk — recompute on mount + every 30 min
  useEffect(() => {
    if (!isNotificationsEnabled()) return;
    const run = async () => {
      const node = getYearNode(year);
      const all = Array.from(
        new Set([
          ...collectQuestions(node, "essay"),
          ...collectQuestions(node, "short-notes"),
        ])
      );

      // 🎯 Daily target — 19:00 IST today (13:30 UTC)
      const today = new Date();
      const targetAt = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 13, 30, 0)
      );
      await cancel([NOTIF_IDS.dailyTarget]);
      if (target) {
        const d = deriveDailyTarget({
          examDateISO: target.exam_date,
          totalQuestions: all.length,
          completedQuestions: countDone(all),
          doneToday,
        });
        if (d && d.leftToday > 0) {
          await scheduleOne({
            id: NOTIF_IDS.dailyTarget,
            title: "🎯 Daily target",
            body: `${d.leftToday} question${d.leftToday === 1 ? "" : "s"} left today to stay on pace.`,
            at: targetAt,
          });
        }
      }

      // 🔥 Streak-at-risk — 21:00 IST today (15:30 UTC) if streak ≥ 2 & no open today
      await cancel([NOTIF_IDS.streakRisk]);
      const streak = Number(cloud?.streak ?? 0);
      const lastOpenStr: string | null = cloud?.last_active_date ?? null;
      const todayIstStr = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const openedToday = lastOpenStr === todayIstStr;
      if (streak >= 2 && !openedToday) {
        const riskAt = new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 15, 30, 0)
        );
        await scheduleOne({
          id: NOTIF_IDS.streakRisk,
          title: "🔥 Don't break your streak!",
          body: `You have a ${streak}-day streak. Open Orbit to keep it alive.`,
          at: riskAt,
        });
      }
    };
    run();
    const t = setInterval(run, 30 * 60 * 1000);
    return () => clearInterval(t);
  }, [year, target, doneToday, cloud?.streak, cloud?.last_active_date]);
}
