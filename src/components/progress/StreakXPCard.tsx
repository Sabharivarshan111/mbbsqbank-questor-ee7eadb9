import { Flame, Award } from "lucide-react";
import { useCountUp } from "@/hooks/use-count-up";
import { useTheme } from "@/components/theme/ThemeProvider";
import { getThemeGradient } from "@/lib/theme-gradients";

interface Props {
  xp: number;          // year XP (primary)
  lifetimeXp?: number; // lifetime XP (subtitle)
  streak: number;
}

const BADGES = [
  { n: 10, label: "Bronze" },
  { n: 50, label: "Silver" },
  { n: 100, label: "Gold" },
  { n: 500, label: "Legend" },
];

const StreakXPCard = ({ xp, lifetimeXp, streak }: Props) => {
  const level = Math.floor(xp / 50) + 1;
  const inLevel = xp % 50;
  const pct = (inLevel / 50) * 100;
  const streakAnim = useCountUp(streak);
  const xpAnim = useCountUp(xp);
  const { theme } = useTheme();
  const grad = getThemeGradient(theme);
  const showLifetime = typeof lifetimeXp === "number" && lifetimeXp !== xp;

  return (
    <div
      className="relative rounded-2xl bg-card border p-4 space-y-3 animate-fade-in overflow-hidden"
      style={{ animationDelay: "80ms" }}
    >
      {/* Soft theme aura */}
      <div className={`pointer-events-none absolute -inset-px opacity-[0.08] ${grad.bg}`} />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame
            className={`h-5 w-5 text-orange-500 ${streak > 0 ? "animate-pulse drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" : ""}`}
          />
          <span className="font-semibold">{streakAnim} day streak</span>
        </div>
        <div className="text-xs text-muted-foreground text-right">
          <div>
            Level <span className={`font-bold bg-clip-text text-transparent ${grad.text}`}>{level}</span>
            <span className="ml-2">· {xpAnim} Year XP</span>
          </div>
          {showLifetime && (
            <div className="text-[10px] mt-0.5 opacity-80">Lifetime: {lifetimeXp} XP</div>
          )}
        </div>
      </div>
      <div className="relative">
        <div className="h-2.5 rounded-full bg-muted overflow-hidden relative">
          <div
            className={`h-full ${grad.bg} relative`}
            style={{ width: `${pct}%`, transition: "width 800ms cubic-bezier(0.22, 1, 0.36, 1)" }}
          >
            {/* shimmer sweep */}
            <div
              className="absolute inset-y-0 w-1/3"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
                animation: "xp-shimmer 2.2s linear infinite",
              }}
            />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">{inLevel} / 50 XP to level {level + 1}</p>
      </div>
      <div className="relative flex gap-2">
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
      <style>{`
        @keyframes xp-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
};

export default StreakXPCard;
