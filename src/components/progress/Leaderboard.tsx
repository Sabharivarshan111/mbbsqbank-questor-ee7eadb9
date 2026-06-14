import { useMemo, useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, Trophy } from "lucide-react";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { useWeeklyLeaderboard } from "@/hooks/use-weekly-leaderboard";
import type { Year } from "@/lib/year-subjects";
import { YEAR_LABELS } from "@/lib/year-subjects";
import { XP_BADGES } from "@/lib/rewards";
import { QUESTION_PROGRESS_EVENT, countLocalYearXp } from "@/lib/question-progress";
import UserStatsDialog, { type UserStat } from "./UserStatsDialog";

interface Props {
  year: Year;
  currentUserId: string | null;
  enabled: boolean;
}

type Period = "weekly" | "lifetime";

function highestXpBadge(xp: number) {
  let best = null as null | (typeof XP_BADGES)[number];
  for (const b of XP_BADGES) if (xp >= b.threshold) best = b;
  return best;
}

function msUntilNextMonday(): number {
  const now = new Date();
  const day = now.getDay(); // 0 Sun ... 1 Mon
  const daysUntilMon = (8 - day) % 7 || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilMon);
  next.setHours(0, 0, 0, 0);
  return next.getTime() - now.getTime();
}

function formatCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

const Leaderboard = ({ year, currentUserId, enabled }: Props) => {
  const [period, setPeriod] = useState<Period>("weekly");
  const [selected, setSelected] = useState<UserStat | null>(null);

  const lifetime = useLeaderboard(year, enabled);
  const weekly = useWeeklyLeaderboard(year, enabled);

  // Live local year XP — drives instant rank updates for the current user.
  const [localYearXp, setLocalYearXp] = useState<number>(() => countLocalYearXp(year));
  useEffect(() => {
    const recompute = () => setLocalYearXp(countLocalYearXp(year));
    recompute();
    window.addEventListener(QUESTION_PROGRESS_EVENT, recompute);
    window.addEventListener("storage", recompute);
    return () => {
      window.removeEventListener(QUESTION_PROGRESS_EVENT, recompute);
      window.removeEventListener("storage", recompute);
    };
  }, [year]);

  // Weekly countdown ticker
  const [countdown, setCountdown] = useState(msUntilNextMonday());
  useEffect(() => {
    const i = setInterval(() => setCountdown(msUntilNextMonday()), 60_000);
    return () => clearInterval(i);
  }, []);

  const rows = useMemo(() => {
    const source =
      period === "weekly"
        ? weekly.rows.map((r) => ({
            id: r.id,
            display_name: r.display_name,
            year: r.year,
            primary: r.weekly_xp,
            year_xp: r.year_xp,
            weekly_xp: r.weekly_xp,
            xp: r.xp,
            streak: r.streak,
            tiebreak_seconds: r.weekly_seconds,
            year_seconds: r.year_seconds,
            weekly_seconds: r.weekly_seconds,
          }))
        : lifetime.rows.map((r) => ({
            id: r.id,
            display_name: r.display_name,
            year: r.year,
            primary: r.year_xp,
            year_xp: r.year_xp,
            weekly_xp: 0,
            xp: r.xp,
            streak: r.streak,
            tiebreak_seconds: r.year_seconds,
            year_seconds: r.year_seconds,
            weekly_seconds: 0,
          }));


    // Dedupe by name+year
    const seen = new Map<string, typeof source[number]>();
    for (const r of source) {
      const key = `${r.display_name.trim().toLowerCase()}::${r.year}`;
      const prev = seen.get(key);
      if (!prev) { seen.set(key, r); continue; }
      if (r.id === currentUserId) seen.set(key, r);
      else if (prev.id !== currentUserId && r.primary > prev.primary) seen.set(key, r);
    }

    // Current-user override: lifetime mirrors local year XP instantly.
    if (currentUserId && period === "lifetime") {
      for (const [k, v] of seen) {
        if (v.id === currentUserId) {
          const live = Math.min(v.year_xp, localYearXp);
          seen.set(k, { ...v, year_xp: live, primary: live });
          break;
        }
      }
    }

    return Array.from(seen.values()).sort(
      (a, b) =>
        b.primary - a.primary ||
        b.streak - a.streak ||
        b.tiebreak_seconds - a.tiebreak_seconds ||
        a.display_name.localeCompare(b.display_name)
    );
  }, [period, weekly.rows, lifetime.rows, currentUserId, localYearXp]);


  const me = useMemo<UserStat | null>(() => {
    if (!currentUserId) return null;
    const r = rows.find((x) => x.id === currentUserId);
    return r
      ? {
          id: r.id,
          display_name: r.display_name,
          year: r.year,
          xp: r.xp,
          year_xp: r.year_xp,
          weekly_xp: r.weekly_xp,
          streak: r.streak,
          year_seconds: r.year_seconds,
          weekly_seconds: r.weekly_seconds,
        }
      : null;
  }, [rows, currentUserId]);


  if (!enabled) {
    return (
      <div className="rounded-2xl bg-card border p-4 text-center text-sm text-muted-foreground">
        <Trophy className="h-5 w-5 mx-auto mb-2 text-primary" />
        Sign in to join the leaderboard (set your name above).
      </div>
    );
  }

  const loading = period === "weekly" ? weekly.loading : lifetime.loading;

  return (
    <div className="rounded-2xl bg-card border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <Trophy className="h-5 w-5 text-amber-500" />
          Leaderboard
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList className="h-7">
            <TabsTrigger value="weekly" className="text-xs h-6 px-2">Weekly</TabsTrigger>
            <TabsTrigger value="lifetime" className="text-xs h-6 px-2">Lifetime</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        {period === "weekly"
          ? `${YEAR_LABELS[year]} • XP earned this week only. Resets in ${formatCountdown(countdown)}.`
          : `${YEAR_LABELS[year]} • All-time XP for this year. No reset.`}
        <br/>Ties broken by streak, then time spent in the app this year.
      </p>


      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {loading && rows.length === 0 && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!loading && rows.length === 0 && (
          <p className="text-xs text-muted-foreground">No one here yet — be the first!</p>
        )}
        {rows.map((r, i) => {
          const isMe = r.id === currentUserId;
          const badge = highestXpBadge(r.year_xp);
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
          return (
            <button
              type="button"
              key={r.id}
              onClick={() =>
                setSelected({
                  id: r.id,
                  display_name: r.display_name,
                  year: r.year,
                  xp: r.xp,
                  year_xp: r.year_xp,
                  weekly_xp: r.weekly_xp,
                  streak: r.streak,
                  year_seconds: r.year_seconds,
                  weekly_seconds: r.weekly_seconds,
                })
              }

              className={`w-full text-left flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm animate-fade-in transition-all hover:scale-[1.01] active:scale-[0.99] ${
                isMe
                  ? "bg-gradient-to-r from-fuchsia-500/15 via-pink-500/15 to-orange-400/15 ring-2 ring-primary/50 shadow-[0_0_12px_hsl(var(--primary)/0.35)]"
                  : i < 3
                  ? "bg-gradient-to-r from-amber-500/10 to-transparent hover:from-amber-500/20"
                  : "bg-muted/40 hover:bg-muted/60"
              }`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className="w-6 text-center text-xs font-bold text-muted-foreground">
                {medal ?? `#${i + 1}`}
              </span>
              <span className="flex-1 truncate font-medium flex items-center gap-1">
                {r.display_name}{isMe && " (you)"}
                {badge && <span title={badge.label} className="text-xs">{badge.emoji}</span>}
              </span>
              <span className="flex items-center gap-0.5 text-xs text-orange-500">
                <Flame className="h-3 w-3" />{r.streak}
              </span>
              <span className="text-xs font-semibold text-primary w-12 text-right">
                {r.primary} XP
              </span>
            </button>
          );
        })}
      </div>

      <UserStatsDialog
        open={!!selected}
        target={selected}
        me={me}
        onClose={() => setSelected(null)}
      />
    </div>
  );
};

export default Leaderboard;
