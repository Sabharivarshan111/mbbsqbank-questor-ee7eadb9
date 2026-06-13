import { useMemo } from "react";
import { Zap, Flame } from "lucide-react";
import { XP_BADGES, STREAK_BADGES } from "@/lib/rewards";

interface Props {
  xp: number;
  streak: number;
}

const StreakTipsCard = ({ xp, streak }: Props) => {
  const xpTip = useMemo(() => {
    const level = Math.floor(xp / 50) + 1;
    const toLevel = 50 - (xp % 50);
    const nextXp = XP_BADGES.find((b) => xp < b.threshold);
    if (nextXp && nextXp.threshold - xp <= 5) {
      return `Just ${nextXp.threshold - xp} more XP to unlock ${nextXp.emoji} ${nextXp.label}.`;
    }
    if (toLevel <= 5) return `${toLevel} XP away from Level ${level + 1} — finish one more question!`;
    const tips = [
      "Mark questions done in any subject — every one = +1 XP.",
      `Hit Level ${level + 1} with just ${toLevel} more XP.`,
      "Tackle 5 MCQs in a sitting for a quick +5 XP boost.",
      "Open an Essay topic and finish one question — instant XP.",
      "Short Notes count too — small reads, real rewards.",
    ];
    return tips[xp % tips.length];
  }, [xp]);

  const streakTip = useMemo(() => {
    if (streak === 0) return "Answer one question today to start your streak — it only takes a minute.";
    const nextStreak = STREAK_BADGES.find((b) => streak < b.threshold);
    if (nextStreak && nextStreak.threshold - streak <= 2) {
      const d = nextStreak.threshold - streak;
      return `${d} more day${d === 1 ? "" : "s"} until ${nextStreak.label} 🔥`;
    }
    const tips = [
      "Open the app daily — even 1 question keeps the flame alive.",
      "Miss a day and the streak resets. Don't break the chain!",
      `You're on ${streak} days — momentum is your superpower.`,
      "Set a daily reminder at the same time to lock in the habit.",
    ];
    return tips[streak % tips.length];
  }, [streak]);

  return (
    <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-transparent to-pink-500/5 p-3.5 space-y-3 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center flex-shrink-0">
          <Zap className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-500 mb-0.5">
            Earn more XP
          </p>
          <p className="text-sm leading-snug">{xpTip}</p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-orange-500/15 text-orange-500 flex items-center justify-center flex-shrink-0">
          <Flame className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-500 mb-0.5">
            Grow your streak
          </p>
          <p className="text-sm leading-snug">{streakTip}</p>
        </div>
      </div>
    </div>
  );
};

export default StreakTipsCard;
