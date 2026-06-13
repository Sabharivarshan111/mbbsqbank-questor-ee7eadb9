import { Flame, Award } from "lucide-react";
import { useCountUp } from "@/hooks/use-count-up";

interface Props {
  xp: number;
  streak: number;
}

const BADGES = [
  { n: 10, label: "Bronze" },
  { n: 50, label: "Silver" },
  { n: 100, label: "Gold" },
  { n: 500, label: "Legend" },
];

const StreakXPCard = ({ xp, streak }: Props) => {
  const level = Math.floor(xp / 50) + 1;
  const inLevel = xp % 50;
  const pct = (inLevel / 50) * 100;
  const streakAnim = useCountUp(streak);

  return (
    <div className="rounded-2xl bg-card border p-4 space-y-3 animate-fade-in" style={{ animationDelay: "80ms" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className={`h-5 w-5 text-orange-500 ${streak > 0 ? "animate-pulse" : ""}`} />
          <span className="font-semibold">{streakAnim} day streak</span>
        </div>
        <div className="text-xs text-muted-foreground">Level {level}</div>
      </div>
      <div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-400"
            style={{ width: `${pct}%`, transition: "width 800ms cubic-bezier(0.22, 1, 0.36, 1)" }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">{inLevel} / 50 XP to level {level + 1}</p>
      </div>
      <div className="flex gap-2">
        {BADGES.map((b, i) => {
          const unlocked = xp >= b.n;
          return (
            <div
              key={b.n}
              className={`flex-1 rounded-lg border p-2 text-center transition-all duration-300 animate-scale-in ${
                unlocked
                  ? "bg-gradient-to-br from-fuchsia-500/15 to-orange-400/15 border-primary/40 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.25)]"
                  : "bg-muted/40 text-muted-foreground opacity-60"
              }`}
              style={{ animationDelay: `${i * 80}ms` }}
              title={`${b.label} — ${b.n} questions`}
            >
              <Award className="h-4 w-4 mx-auto" />
              <p className="text-[10px] font-medium mt-0.5">{b.n}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StreakXPCard;
