import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { XP_BADGES, STREAK_BADGES } from "@/lib/rewards";

interface Props {
  xp: number;
  streak: number;
}

const StreakTipsCard = ({ xp, streak }: Props) => {
  const tip = useMemo(() => {
    const level = Math.floor(xp / 50) + 1;
    const toLevel = 50 - (xp % 50);

    // Streak tips
    if (streak === 0) return "Answer one question today to start a streak — it only takes a minute.";
    if (streak < 3) return `You're on a ${streak}-day streak. Answer one question tomorrow to reach 3 days and unlock the Spark badge.`;

    // Next badge
    const nextXp = XP_BADGES.find((b) => xp < b.threshold);
    const nextStreak = STREAK_BADGES.find((b) => streak < b.threshold);
    if (nextXp && nextXp.threshold - xp <= 5) {
      return `Just ${nextXp.threshold - xp} more XP to unlock ${nextXp.emoji} ${nextXp.label}.`;
    }
    if (toLevel <= 5) return `${toLevel} XP away from Level ${level + 1} — finish one more question!`;
    if (nextStreak && nextStreak.threshold - streak <= 2) {
      return `${nextStreak.threshold - streak} more day${nextStreak.threshold - streak === 1 ? "" : "s"} until ${nextStreak.label} 🔥`;
    }

    const tips = [
      "Open the app daily — even one question keeps the streak alive.",
      `Hit Level ${level + 1} with just ${toLevel} more XP.`,
      "Mark questions as done in any subject — every one counts as +1 XP.",
      "Aim for 5 questions a day. Small reps, huge results.",
    ];
    return tips[(xp + streak) % tips.length];
  }, [xp, streak]);

  return (
    <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-transparent to-pink-500/5 p-3.5 flex items-start gap-3 animate-fade-in">
      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
          Pro tip
        </p>
        <p className="text-sm leading-snug">{tip}</p>
      </div>
    </div>
  );
};

export default StreakTipsCard;
