import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Flame, Zap, Trophy, Calendar, Sparkles, GraduationCap, Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { XP_BADGES } from "@/lib/rewards";
import { YEAR_LABELS, type Year } from "@/lib/year-subjects";

export interface UserStat {
  id: string;
  display_name: string;
  year: Year;
  xp: number;         // lifetime
  year_xp: number;    // questions solved in this user's current year (ranking metric)
  weekly_xp: number;
  streak: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  target: UserStat | null;
  me: UserStat | null;
}

function highestXpBadge(xp: number) {
  let best = null as null | (typeof XP_BADGES)[number];
  for (const b of XP_BADGES) if (xp >= b.threshold) best = b;
  return best;
}

function nextXpBadge(xp: number) {
  for (const b of XP_BADGES) if (xp < b.threshold) return b;
  return null;
}

function initials(name: string) {
  return name.split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

type StatKey = "year" | "lifetime" | "week" | "streak";

const EXPLAIN: Record<StatKey, { title: string; body: string }> = {
  year: {
    title: "Year XP",
    body: "Questions you've ticked done in your current MBBS year. This is the ONLY metric that drives leaderboard ranking. Tick a question to earn 1 XP; un-tick to lose 1 XP. Switching year shows that year's separate XP and ranking.",
  },
  lifetime: {
    title: "Lifetime XP",
    body: "Total questions ever ticked across all four years. A long-term record of your study volume. Does not affect leaderboard ranking — it's just for you.",
  },
  week: {
    title: "This week",
    body: "Questions you ticked since Monday. Resets every Monday at 00:00. Informational only — no longer used for ranking.",
  },
  streak: {
    title: "Streak",
    body: "Consecutive days you opened the app. Open ORBIT every day to grow it. Miss a day and it resets to 1 on your next visit.",
  },
};

const StatBtn = ({
  active,
  onClick,
  icon,
  label,
  value,
  color,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative rounded-xl border p-2.5 text-center transition-all ${
      active
        ? "bg-primary/10 border-primary/60 shadow-[0_0_10px_hsl(var(--primary)/0.25)]"
        : "bg-muted/40 hover:bg-muted/60"
    }`}
  >
    <Info className="absolute top-1 right-1 h-2.5 w-2.5 text-muted-foreground/70" />
    <div className={`mx-auto mb-1 h-6 w-6 flex items-center justify-center ${color}`}>{icon}</div>
    <div className="text-base font-bold leading-none">{value}</div>
    <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
  </button>
);

const Compare = ({ label, me, them, unit = "" }: { label: string; me: number; them: number; unit?: string }) => {
  const meLeads = me > them;
  const tie = me === them;
  return (
    <div className="grid grid-cols-3 items-center gap-2 text-xs py-1.5">
      <div className={`text-right font-semibold tabular-nums ${meLeads ? "text-primary" : "text-muted-foreground"}`}>
        {me}{unit}
      </div>
      <div className="text-center text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-left font-semibold tabular-nums ${!meLeads && !tie ? "text-amber-500" : "text-muted-foreground"}`}>
        {them}{unit}
      </div>
    </div>
  );
};

const UserStatsDialog = ({ open, onClose, target, me }: Props) => {
  const [explain, setExplain] = useState<StatKey | null>(null);
  if (!target) return null;
  const isMe = me?.id === target.id;
  const badge = highestXpBadge(target.year_xp);
  const next = nextXpBadge(target.year_xp);
  const pct = next ? Math.min(100, Math.round((target.year_xp / next.threshold) * 100)) : 100;

  const sameYear = !!(me && me.year === target.year);
  const meCompare = me ? (sameYear ? me.year_xp : 0) : 0;
  const xpGap = me ? target.year_xp - meCompare : 0;
  const streakGap = me ? target.streak - me.streak : 0;

  const toggle = (k: StatKey) => setExplain((c) => (c === k ? null : k));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="sr-only">{target.display_name}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 -mt-2">
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-fuchsia-500 via-pink-500 to-orange-400 text-white font-bold text-lg flex items-center justify-center shadow-md">
            {initials(target.display_name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-base truncate">Dr. {target.display_name}</h3>
              {badge && <span title={badge.label}>{badge.emoji}</span>}
            </div>
            <p className="text-xs text-muted-foreground">{YEAR_LABELS[target.year]}</p>
            {badge && <p className="text-[10px] text-primary font-medium">{badge.label}</p>}
            {isMe && <p className="text-[10px] font-semibold text-primary mt-0.5">This is you</p>}
          </div>
        </div>

        {next && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Progress to {next.label} {next.emoji}</span>
              <span>{target.year_xp} / {next.threshold} XP</span>
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          <StatBtn active={explain === "year"} onClick={() => toggle("year")}
            icon={<GraduationCap className="h-4 w-4" />}
            label={`${YEAR_LABELS[target.year].replace(" Year", "")} Yr XP`}
            value={target.year_xp} color="text-emerald-500" />
          <StatBtn active={explain === "lifetime"} onClick={() => toggle("lifetime")}
            icon={<Zap className="h-4 w-4" />} label="Lifetime" value={target.xp} color="text-primary" />
          <StatBtn active={explain === "week"} onClick={() => toggle("week")}
            icon={<Sparkles className="h-4 w-4" />} label="This week" value={target.weekly_xp} color="text-fuchsia-500" />
          <StatBtn active={explain === "streak"} onClick={() => toggle("streak")}
            icon={<Flame className="h-4 w-4" />} label="Streak" value={target.streak} color="text-orange-500" />
        </div>

        {explain && (
          <div className="rounded-xl border bg-muted/40 p-3 text-xs animate-fade-in">
            <p className="font-semibold mb-1">{EXPLAIN[explain].title}</p>
            <p className="text-muted-foreground leading-relaxed">{EXPLAIN[explain].body}</p>
          </div>
        )}

        {me && !isMe && (
          <div className="rounded-xl border bg-card p-3 space-y-1">
            <div className="grid grid-cols-3 text-[10px] uppercase tracking-wide font-semibold text-muted-foreground pb-1 border-b">
              <span className="text-right text-primary">You</span>
              <span className="text-center">vs</span>
              <span className="text-left text-amber-500 truncate">{target.display_name}</span>
            </div>
            {sameYear ? (
              <Compare label={`${YEAR_LABELS[target.year].replace(" Year", "")} Yr XP`} me={me.year_xp} them={target.year_xp} />
            ) : (
              <div className="text-[10px] text-center text-muted-foreground italic py-1">
                Different years — rankings are computed per year, so direct XP comparison isn't meaningful.
              </div>
            )}
            <Compare label="Streak" me={me.streak} them={target.streak} unit="d" />

            <div className="pt-2 mt-1 border-t space-y-1.5">
              {sameYear && xpGap > 0 && (
                <p className="text-xs">
                  <Trophy className="inline h-3.5 w-3.5 mr-1 text-amber-500" />
                  Solve <b>{xpGap}</b> more question{xpGap === 1 ? "" : "s"} to tie, <b>{xpGap + 1}</b> to overtake.
                </p>
              )}
              {sameYear && xpGap < 0 && (
                <p className="text-xs">
                  <Trophy className="inline h-3.5 w-3.5 mr-1 text-primary" />
                  You lead by <b>{Math.abs(xpGap)}</b> XP — stay ahead!
                </p>
              )}
              {streakGap > 0 && (
                <p className="text-xs">
                  <Calendar className="inline h-3.5 w-3.5 mr-1 text-orange-500" />
                  Open the app <b>{streakGap}</b> more day{streakGap === 1 ? "" : "s"} in a row to match their streak.
                </p>
              )}
            </div>
          </div>
        )}

        {!me && !isMe && (
          <p className="text-xs text-muted-foreground text-center">Set up your profile to see how you compare.</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserStatsDialog;
