import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Flame, Zap, Trophy, BookOpen, Calendar, Sparkles, GraduationCap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { XP_BADGES } from "@/lib/rewards";
import { YEAR_LABELS, type Year } from "@/lib/year-subjects";

export interface UserStat {
  id: string;
  display_name: string;
  year: Year;
  xp: number;         // lifetime
  year_xp: number;    // questions solved for this user's current year
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
  return name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const Stat = ({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) => (
  <div className="rounded-xl bg-muted/40 border p-2.5 text-center">
    <div className={`mx-auto mb-1 h-6 w-6 flex items-center justify-center ${color}`}>
      {icon}
    </div>
    <div className="text-base font-bold leading-none">{value}</div>
    <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
  </div>
);

const Compare = ({
  label,
  me,
  them,
  unit = "",
}: {
  label: string;
  me: number;
  them: number;
  unit?: string;
}) => {
  const meLeads = me > them;
  const tie = me === them;
  return (
    <div className="grid grid-cols-3 items-center gap-2 text-xs py-1.5">
      <div className={`text-right font-semibold tabular-nums ${meLeads ? "text-primary" : "text-muted-foreground"}`}>
        {me}{unit}
      </div>
      <div className="text-center text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`text-left font-semibold tabular-nums ${!meLeads && !tie ? "text-amber-500" : "text-muted-foreground"}`}>
        {them}{unit}
      </div>
    </div>
  );
};

const UserStatsDialog = ({ open, onClose, target, me }: Props) => {
  if (!target) return null;
  const isMe = me?.id === target.id;
  const badge = highestXpBadge(target.xp);
  const next = nextXpBadge(target.xp);
  const pct = next ? Math.min(100, Math.round((target.xp / next.threshold) * 100)) : 100;

  const sameYear = !!(me && me.year === target.year);
  // Use year XP for the head-to-head when both are in the same year; otherwise fall back to lifetime.
  const meCompare = me ? (sameYear ? me.year_xp : me.xp) : 0;
  const themCompare = sameYear ? target.year_xp : target.xp;

  const xpGap = me ? themCompare - meCompare : 0;
  const streakGap = me ? target.streak - me.streak : 0;
  const weeklyGap = me ? target.weekly_xp - me.weekly_xp : 0;

  let pep = "";
  if (me && !isMe) {
    if (xpGap > 0) {
      if (xpGap <= 10) pep = `So close! Just ${xpGap} more question${xpGap === 1 ? "" : "s"} to tie.`;
      else if (xpGap <= 50) pep = `Within reach — knock out ${xpGap} more questions to catch up.`;
      else pep = `Big climb — ${xpGap} ${sameYear ? "year" : "lifetime"} XP behind. Chip away one session at a time.`;
    } else if (xpGap < 0) {
      pep = `You're ahead by ${Math.abs(xpGap)} ${sameYear ? "year" : "lifetime"} XP. Keep the lead! 🚀`;
    } else {
      pep = `Dead tie! One question decides it.`;
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="sr-only">{target.display_name}</DialogTitle>
        </DialogHeader>

        {/* Header */}
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
            {badge && (
              <p className="text-[10px] text-primary font-medium">{badge.label}</p>
            )}
            {isMe && (
              <p className="text-[10px] font-semibold text-primary mt-0.5">This is you</p>
            )}
          </div>
        </div>

        {/* Badge progress */}
        {next && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Progress to {next.label} {next.emoji}</span>
              <span>{target.xp} / {next.threshold} XP</span>
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>
        )}

        {/* Stat tiles */}
        <div className="grid grid-cols-4 gap-2">
          <Stat icon={<GraduationCap className="h-4 w-4" />} label={`${YEAR_LABELS[target.year].replace(" Year", "")} Yr XP`} value={target.year_xp} color="text-emerald-500" />
          <Stat icon={<Zap className="h-4 w-4" />} label="Lifetime" value={target.xp} color="text-primary" />
          <Stat icon={<Sparkles className="h-4 w-4" />} label="This week" value={target.weekly_xp} color="text-fuchsia-500" />
          <Stat icon={<Flame className="h-4 w-4" />} label="Streak" value={target.streak} color="text-orange-500" />
        </div>

        {/* Comparison */}
        {me && !isMe && (
          <div className="rounded-xl border bg-card p-3 space-y-1">
            <div className="grid grid-cols-3 text-[10px] uppercase tracking-wide font-semibold text-muted-foreground pb-1 border-b">
              <span className="text-right text-primary">You</span>
              <span className="text-center">vs</span>
              <span className="text-left text-amber-500 truncate">{target.display_name}</span>
            </div>
            {sameYear ? (
              <>
                <Compare label={`${YEAR_LABELS[target.year].replace(" Year", "")} Yr XP`} me={me.year_xp} them={target.year_xp} />
                <Compare label="Lifetime XP" me={me.xp} them={target.xp} />
              </>
            ) : (
              <>
                <Compare label="Lifetime XP" me={me.xp} them={target.xp} />
                <div className="text-[10px] text-center text-muted-foreground italic py-0.5">
                  You're in different years — comparing lifetime totals.
                </div>
              </>
            )}
            <Compare label="This week" me={me.weekly_xp} them={target.weekly_xp} />
            <Compare label="Streak" me={me.streak} them={target.streak} unit="d" />
            <Compare label="Solved" me={me.xp} them={target.xp} />

            <div className="pt-2 mt-1 border-t space-y-1.5">
              {xpGap > 0 && (
                <p className="text-xs">
                  <Trophy className="inline h-3.5 w-3.5 mr-1 text-amber-500" />
                  Solve <b>{xpGap}</b> more {sameYear ? "year" : ""} question{xpGap === 1 ? "" : "s"} to tie, <b>{xpGap + 1}</b> to overtake.
                </p>
              )}
              {xpGap < 0 && (
                <p className="text-xs">
                  <Trophy className="inline h-3.5 w-3.5 mr-1 text-primary" />
                  You lead by <b>{Math.abs(xpGap)}</b> {sameYear ? "year" : "lifetime"} XP — stay ahead!
                </p>
              )}
              {streakGap > 0 && (
                <p className="text-xs">
                  <Calendar className="inline h-3.5 w-3.5 mr-1 text-orange-500" />
                  Open the app <b>{streakGap}</b> more day{streakGap === 1 ? "" : "s"} in a row to match their streak.
                </p>
              )}
              {weeklyGap > 0 && (
                <p className="text-xs">
                  <Sparkles className="inline h-3.5 w-3.5 mr-1 text-fuchsia-500" />
                  This week they earned <b>{weeklyGap}</b> more XP than you.
                </p>
              )}
              {pep && <p className="text-xs text-muted-foreground italic pt-1">{pep}</p>}
            </div>
          </div>
        )}

        {!me && !isMe && (
          <p className="text-xs text-muted-foreground text-center">
            Set up your profile to see how you compare.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserStatsDialog;
