import { useMemo, useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, Trophy } from "lucide-react";
import { useLeaderboard } from "@/hooks/use-leaderboard";
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

const Leaderboard = ({ year, currentUserId, enabled }: Props) => {
  const [scope, setScope] = useState<"year" | "all">("year");
  const [selected, setSelected] = useState<UserStat | null>(null);
  const board = useLeaderboard(scope === "year" ? year : "all", enabled);

  // Live local year XP for the current user — drives instant rank updates on tick/un-tick.
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

  const rows = useMemo(() => {
    const raw = board.rows.map((r) => ({
      id: r.id,
      display_name: r.display_name,
      year: r.year,
      primary: r.year_xp,
      xp: r.xp,
      year_xp: r.year_xp,
      streak: r.streak,
    }));

    // Dedupe by (lowercased name + year), keeping the current user or the higher score.
    const seen = new Map<string, typeof raw[number]>();
    for (const r of raw) {
      const key = `${r.display_name.trim().toLowerCase()}::${r.year}`;
      const prev = seen.get(key);
      if (!prev) { seen.set(key, r); continue; }
      if (r.id === currentUserId) seen.set(key, r);
      else if (prev.id !== currentUserId && r.primary > prev.primary) seen.set(key, r);
    }

    // Override the current user's row with live local year XP so un-ticks shrink rank instantly.
    if (currentUserId) {
      for (const [k, v] of seen) {
        if (v.id === currentUserId) {
          const live = scope === "year" ? Math.min(v.year_xp, localYearXp) : v.year_xp;
          seen.set(k, { ...v, year_xp: live, primary: live });
          break;
        }
      }
    }

    return Array.from(seen.values()).sort(
      (a, b) =>
        b.primary - a.primary ||
        b.streak - a.streak ||
        a.display_name.localeCompare(b.display_name)
    );
  }, [board.rows, currentUserId, localYearXp, scope]);

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
          weekly_xp: 0,
          streak: r.streak,
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

      <p className="text-[10px] text-muted-foreground">
        Ranked by {scope === "year" ? `${YEAR_LABELS[year]} XP` : "each user's year XP"} — 1 XP per question ticked done. Un-tick to lose it.
      </p>

      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {board.loading && rows.length === 0 && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!board.loading && rows.length === 0 && (
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
                  weekly_xp: 0,
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
              {scope === "all" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-background text-muted-foreground">
                  {YEAR_LABELS[r.year].replace(" Year", "")}
                </span>
              )}
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
