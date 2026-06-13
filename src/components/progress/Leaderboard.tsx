import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, Trophy } from "lucide-react";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import type { Year } from "@/lib/year-subjects";
import { YEAR_LABELS } from "@/lib/year-subjects";

interface Props {
  year: Year;
  currentUserId: string | null;
  enabled: boolean;
}

const Leaderboard = ({ year, currentUserId, enabled }: Props) => {
  const [tab, setTab] = useState<"year" | "all">("year");
  const { rows, loading } = useLeaderboard(tab === "year" ? year : "all", enabled);

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
        <Tabs value={tab} onValueChange={(v) => setTab(v as "year" | "all")}>
          <TabsList className="h-7">
            <TabsTrigger value="year" className="text-xs h-6 px-2">My Year</TabsTrigger>
            <TabsTrigger value="all" className="text-xs h-6 px-2">Global</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {loading && rows.length === 0 && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!loading && rows.length === 0 && <p className="text-xs text-muted-foreground">No one here yet — be the first!</p>}
        {rows.map((r, i) => {
          const isMe = r.id === currentUserId;
          return (
            <div
              key={r.id}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm ${
                isMe ? "bg-primary/15 border border-primary/30" : "bg-muted/40"
              }`}
            >
              <span className="w-6 text-center text-xs font-bold text-muted-foreground">#{i + 1}</span>
              <span className="flex-1 truncate font-medium">{r.display_name}{isMe && " (you)"}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-background text-muted-foreground">
                {YEAR_LABELS[r.year].replace(" Year", "")}
              </span>
              <span className="flex items-center gap-0.5 text-xs text-orange-500">
                <Flame className="h-3 w-3" />{r.streak}
              </span>
              <span className="text-xs font-semibold text-primary w-10 text-right">{r.xp} XP</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Leaderboard;
