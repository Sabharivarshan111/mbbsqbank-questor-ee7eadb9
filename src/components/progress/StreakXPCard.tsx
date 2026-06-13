import { Flame, Award } from "lucide-react";

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

  return (
    <div className="rounded-2xl bg-card border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          <span className="font-semibold">{streak} day streak</span>
        </div>
        <div className="text-xs text-muted-foreground">Level {level}</div>
      </div>
      <div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">{inLevel} / 50 XP to level {level + 1}</p>
      </div>
      <div className="flex gap-2">
        {BADGES.map((b) => {
          const unlocked = xp >= b.n;
          return (
            <div
              key={b.n}
              className={`flex-1 rounded-lg border p-2 text-center transition ${
                unlocked ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted/40 text-muted-foreground opacity-60"
              }`}
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
