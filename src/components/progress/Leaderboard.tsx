import { useMemo, useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, Trophy, Clock } from "lucide-react";
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

function highestXpBadge(xp: number) {
  let best = null as null | (typeof XP_BADGES)[number];
  for (const b of XP_BADGES) if (xp >= b.threshold) best = b;
  return best;
}

function useResetCountdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const d = new Date(now);
  const day = d.getDay(); // 0 Sun
  const daysToMonday = (8 - (day === 0 ? 7 : day)) % 7 || 7;
  const next = new Date(d);
  next.setDate(d.getDate() + daysToMonday);
  next.setHours(0, 0, 0, 0);
  const ms = next.getTime() - now;
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  return `${days}d ${hours}h`;
}

const Leaderboard = ({ year, currentUserId, enabled }: Props) => {
  const [scope, setScope] = useState<"year" | "all">("year");
  const [period, setPeriod] = useState<"weekly" | "lifetime">("weekly");
  const [selected, setSelected] = useState<UserStat | null>(null);
  const lifetime = useLeaderboard(scope === "year" ? year : "all", enabled && period === "lifetime");
  const weekly = useWeeklyLeaderboard(scope === "year" ? year : "all", enabled && period === "weekly");
  const countdown = useResetCountdown();

  // Live local XP for the current user — overrides cloud row instantly on tick/un-tick.
  const [localXp, setLocalXp] = useState<number>(() => readLocalXp());
  useEffect(() => {
    const h = () => setLocalXp(readLocalXp());
    window.addEventListener(QUESTION_PROGRESS_EVENT, h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener(QUESTION_PROGRESS_EVENT, h);
      window.removeEventListener("storage", h);
    };
  }, []);

  const rows = useMemo(() => {
    const raw = period === "weekly"
      ? weekly.rows.map((r) => ({
          id: r.id,
          display_name: r.display_name,
          year: r.year,
          primary: r.weekly_xp,
          xp: r.xp,
          weekly_xp: r.weekly_xp,
          year_xp: r.year_xp,
          streak: r.streak,
        }))
      : lifetime.rows.map((r) => ({
          id: r.id,
          display_name: r.display_name,
          year: r.year,
          primary: r.year_xp,
          xp: r.xp,
          weekly_xp: 0,
          year_xp: r.year_xp,
          streak: r.streak,
        }));

    // Dedupe by (lowercased trimmed name + year). Keep the row with the highest
    // primary score; preserve the current user's row regardless.
    const seen = new Map<string, typeof raw[number]>();
    for (const r of raw) {
      const key = `${r.display_name.trim().toLowerCase()}::${r.year}`;
      const prev = seen.get(key);
      if (!prev) {
        seen.set(key, r);
        continue;
      }
      if (r.id === currentUserId) seen.set(key, r);
      else if (prev.id !== currentUserId && r.primary > prev.primary) seen.set(key, r);
    }

    // Override the current user's XP with the live local count so un-ticks
    // shrink XP and rank instantly without waiting for Supabase.
    if (currentUserId) {
      const meRow = seen.get(
        Array.from(seen.entries()).find(([, v]) => v.id === currentUserId)?.[0] ?? ""
      );
      if (meRow) {
        const liveXp = localXp;
        const liveYearXp = Math.min(meRow.year_xp, liveXp);
        // For weekly we can only safely lower (not raise) using local data since
        // local XP is lifetime-scoped; raise stays cloud-driven.
        const liveWeekly = Math.min(meRow.weekly_xp, liveXp);
        const livePrimary = period === "weekly" ? liveWeekly : liveYearXp;
        const updated = {
          ...meRow,
          xp: liveXp,
          year_xp: liveYearXp,
          weekly_xp: liveWeekly,
          primary: livePrimary,
        };
        for (const [k, v] of seen) if (v.id === currentUserId) seen.set(k, updated);
      }
    }

    return Array.from(seen.values()).sort(
      (a, b) =>
        b.primary - a.primary ||
        b.xp - a.xp ||
        b.year_xp - a.year_xp ||
        b.streak - a.streak ||
        a.display_name.localeCompare(b.display_name)
    );
  }, [period, weekly.rows, lifetime.rows, currentUserId, localXp]);

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
        }
      : null;
  }, [rows, currentUserId]);

  const loading = period === "weekly" ? weekly.loading : lifetime.loading;

  if (!enabled) {
    return (
      <div className="rounded-2xl bg-card border p-4 text-center text-sm text-muted-foreground">
        <Trophy className="h-5 w-5 mx-auto mb-2 text-primary" />
        Sign in to join the leaderboard (set your name above).
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <Trophy className="h-5 w-5 text-amber-500" />
          Leaderboard
        </div>
        <Tabs value={scope} onValueChange={(v) => setScope(v as "year" | "all")}>
          <TabsList className="h-7">
            <TabsTrigger value="year" className="text-xs h-6 px-2">My Year</TabsTrigger>
            <TabsTrigger value="all" className="text-xs h-6 px-2">Global</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex items-center justify-between">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as "weekly" | "lifetime")}>
          <TabsList className="h-7">
            <TabsTrigger value="weekly" className="text-xs h-6 px-2">This Week</TabsTrigger>
            <TabsTrigger value="lifetime" className="text-xs h-6 px-2">Lifetime</TabsTrigger>
          </TabsList>
        </Tabs>
        {period === "weekly" && (
          <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> resets in {countdown}
          </span>
        )}
      </div>

      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {loading && rows.length === 0 && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!loading && rows.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {period === "weekly" ? "No XP earned this week yet — be the first!" : "No one here yet — be the first!"}
          </p>
        )}
        {rows.map((r, i) => {
          const isMe = r.id === currentUserId;
          const badge = highestXpBadge(r.xp);
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
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-background text-muted-foreground">
                {YEAR_LABELS[r.year].replace(" Year", "")}
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
