import { useMemo } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { XP_BADGES, STREAK_BADGES, getRewardsState, type BadgeDef } from "@/lib/rewards";
import { useTheme } from "@/components/theme/ThemeProvider";
import { getThemeGradient } from "@/lib/theme-gradients";

interface Props {
  xp: number;
  streak: number;
}

const TIER_GLOW: Record<string, string> = {
  bronze:    "from-amber-700/30 to-amber-500/20 border-amber-600/40",
  silver:    "from-slate-400/30 to-slate-200/20 border-slate-300/40",
  gold:      "from-yellow-400/30 to-amber-300/20 border-yellow-400/50",
  platinum:  "from-cyan-300/30 to-blue-400/20 border-cyan-300/50",
  diamond:   "from-sky-300/40 to-fuchsia-400/30 border-sky-300/60",
  legendary: "from-fuchsia-500/40 via-orange-400/30 to-yellow-300/30 border-fuchsia-400/60",
};

const BadgeTile = ({ b, unlocked, progress }: { b: BadgeDef; unlocked: boolean; progress: number }) => {
  return (
    <div
      className={`relative rounded-xl border p-2.5 text-center transition-all duration-300 ${
        unlocked
          ? `bg-gradient-to-br ${TIER_GLOW[b.tier]} shadow-[0_0_18px_hsl(var(--primary)/0.25)] animate-scale-in`
          : "bg-muted/30 border-border/50 opacity-70 hover:opacity-100"
      }`}
      title={`${b.label} — ${b.threshold} ${b.kind === "xp" ? "XP" : "days"}`}
    >
      <div className={`text-2xl ${unlocked ? "" : "grayscale opacity-60"}`}>{b.emoji}</div>
      <p className="text-[10px] font-semibold mt-1 truncate">{b.label}</p>
      <p className="text-[9px] text-muted-foreground">
        {b.threshold} {b.kind === "xp" ? "XP" : "d"}
      </p>
      {!unlocked && (
        <>
          <div className="absolute top-1 right-1 text-muted-foreground">
            <Lock className="h-2.5 w-2.5" />
          </div>
          <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary/50"
              style={{ width: `${Math.min(100, progress)}%`, transition: "width 600ms ease-out" }}
            />
          </div>
        </>
      )}
    </div>
  );
};

const RewardsShelf = ({ xp, streak }: Props) => {
  const state = useMemo(() => getRewardsState(), [xp, streak]);
  const { theme } = useTheme();
  const grad = getThemeGradient(theme);
  const totalUnlocked = Object.keys(state.unlocked).length;
  const total = XP_BADGES.length + STREAK_BADGES.length;

  return (
    <Collapsible className="rounded-2xl bg-card border p-4 space-y-3 animate-fade-in" defaultOpen>
      <CollapsibleTrigger className="w-full flex items-center justify-between group">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏆</span>
          <span className="font-semibold">Rewards</span>
          <span className={`text-xs font-bold bg-clip-text text-transparent ${grad.text}`}>
            {totalUnlocked} / {total}
          </span>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">XP Milestones</p>
          <div className="grid grid-cols-3 gap-2">
            {XP_BADGES.map((b) => (
              <BadgeTile
                key={b.id}
                b={b}
                unlocked={!!state.unlocked[b.id] || xp >= b.threshold}
                progress={(xp / b.threshold) * 100}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Streak Badges</p>
          <div className="grid grid-cols-5 gap-2">
            {STREAK_BADGES.map((b) => (
              <BadgeTile
                key={b.id}
                b={b}
                unlocked={!!state.unlocked[b.id] || streak >= b.threshold}
                progress={(streak / b.threshold) * 100}
              />
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default RewardsShelf;
