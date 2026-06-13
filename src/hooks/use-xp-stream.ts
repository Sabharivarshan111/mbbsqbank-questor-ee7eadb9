import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { QUESTION_PROGRESS_EVENT } from "@/lib/question-progress";
import {
  detectNewUnlocks,
  commitUnlocks,
  readLocalXp,
} from "@/lib/rewards";

interface Options {
  userId: string | null;
  cloudXp: number;
  cloudStreak: number;
  displayName?: string;
  onCelebrate: (payload: { kind: "level" | "streak" | "badge"; value: number; label?: string; emoji?: string }) => void;
  onXpDelta: (delta: number) => void;
}

/**
 * Listens for XP / streak changes (local progress events + Supabase realtime
 * on profiles) and triggers toasts + celebration callbacks.
 */
export function useXpStream({
  userId,
  cloudXp,
  cloudStreak,
  displayName,
  onCelebrate,
  onXpDelta,
}: Options) {
  const prevXp = useRef<number>(Math.max(cloudXp, readLocalXp()));
  const prevStreak = useRef<number>(cloudStreak);

  // Sync refs when cloud values arrive
  useEffect(() => {
    const xp = Math.max(cloudXp, readLocalXp());
    if (xp > prevXp.current) {
      const delta = xp - prevXp.current;
      handleXpChange(prevXp.current, xp, delta);
    }
    prevXp.current = xp;
  }, [cloudXp]);

  useEffect(() => {
    if (cloudStreak > prevStreak.current) {
      handleStreakChange(prevStreak.current, cloudStreak);
    }
    prevStreak.current = cloudStreak;
  }, [cloudStreak]);

  function handleXpChange(from: number, to: number, delta: number) {
    onXpDelta(delta);
    const path = typeof window !== "undefined" ? window.location.pathname : "";
    const inSubject = path.startsWith("/subjects/");
    const desc = inSubject
      ? "📝 Keep crushing it — every question counts!"
      : displayName
      ? `Great work, Dr. ${displayName}!`
      : "Keep going!";
    toast.success(`+${delta} XP`, { description: desc, duration: 2000 });
    const unlocks = detectNewUnlocks(to, prevStreak.current);
    if (unlocks.leveledUp) {
      onCelebrate({ kind: "level", value: unlocks.leveledUp });
    }
    for (const b of unlocks.badges) {
      onCelebrate({ kind: "badge", value: b.threshold, label: b.label, emoji: b.emoji });
    }
    commitUnlocks(unlocks, to, prevStreak.current);
  }

  function handleStreakChange(from: number, to: number) {
    toast(`🔥 ${to}-day streak!`, {
      description: "Keep the flame alive — answer one question tomorrow.",
      duration: 2500,
    });
    const unlocks = detectNewUnlocks(prevXp.current, to);
    if (unlocks.streakMilestone) {
      onCelebrate({ kind: "streak", value: unlocks.streakMilestone });
    }
    for (const b of unlocks.badges) {
      onCelebrate({ kind: "badge", value: b.threshold, label: b.label, emoji: b.emoji });
    }
    commitUnlocks(unlocks, prevXp.current, to);
  }

  // Local progress event → recompute local XP
  useEffect(() => {
    const handler = () => {
      const xp = Math.max(prevXp.current, readLocalXp());
      if (xp > prevXp.current) {
        const delta = xp - prevXp.current;
        handleXpChange(prevXp.current, xp, delta);
        prevXp.current = xp;
      }
    };
    window.addEventListener(QUESTION_PROGRESS_EVENT, handler);
    return () => window.removeEventListener(QUESTION_PROGRESS_EVENT, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayName]);

  // Realtime subscription on profiles row
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`profile:${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        (payload: any) => {
          const newXp: number = payload.new?.xp ?? 0;
          const newStreak: number = payload.new?.streak ?? 0;
          if (newXp > prevXp.current) {
            const delta = newXp - prevXp.current;
            handleXpChange(prevXp.current, newXp, delta);
            prevXp.current = newXp;
          }
          if (newStreak > prevStreak.current) {
            handleStreakChange(prevStreak.current, newStreak);
            prevStreak.current = newStreak;
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}
