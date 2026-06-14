import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/use-profile";
import OnboardingDialog from "./OnboardingDialog";
import YearRingCard from "./YearRingCard";
import SubjectsList from "./SubjectsList";
import StreakXPCard from "./StreakXPCard";
import Leaderboard from "./Leaderboard";
import GoogleSyncButton from "./GoogleSyncButton";
import RewardsShelf from "./RewardsShelf";
import StreakTipsCard from "./StreakTipsCard";
import { getYearNode, YEAR_LABELS } from "@/lib/year-subjects";
import { collectQuestions, countDone, QUESTION_PROGRESS_EVENT } from "@/lib/question-progress";
import { readLocalXp } from "@/lib/rewards";
import { supabase } from "@/integrations/supabase/client";

const ProgressDashboard = () => {
  const { local, cloud, userId, email, isAnonymous, needsOnboarding, saveProfile, setNeedsOnboarding, signOut } = useProfile();
  const [editOpen, setEditOpen] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const h = () => setTick((t) => t + 1);
    window.addEventListener(QUESTION_PROGRESS_EVENT, h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener(QUESTION_PROGRESS_EVENT, h);
      window.removeEventListener("storage", h);
    };
  }, []);

  const year = local?.year ?? "first";

  const { completed, total } = useMemo(() => {
    if (!local) return { completed: 0, total: 0 };
    const node = getYearNode(year);
    const all = Array.from(new Set([
      ...collectQuestions(node, "essay"),
      ...collectQuestions(node, "short-notes"),
    ]));
    return { completed: countDone(all), total: all.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, local, tick]);

  const lifetimeXp = cloud?.xp ?? completed;
  const streak = cloud?.streak ?? 0;

  // Year-scoped XP from cloud (questions completed for the current year)
  const [yearXp, setYearXp] = useState<number>(0);
  useEffect(() => {
    if (!userId) { setYearXp(0); return; }
    let cancelled = false;
    const fetchYearXp = async () => {
      const { data } = await (supabase as any).rpc("get_year_lifetime_xp", {
        _user_id: userId,
        _year: year,
      });
      if (!cancelled && typeof data === "number") setYearXp(data);
    };
    fetchYearXp();
    const channel = supabase
      .channel(`year-xp:${userId}:${year}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "question_progress", filter: `user_id=eq.${userId}` },
        () => fetchYearXp()
      )
      .subscribe();
    // Also refetch on local progress events (covers tick/untick before realtime arrives)
    const onLocal = () => { setTimeout(fetchYearXp, 350); };
    window.addEventListener(QUESTION_PROGRESS_EVENT, onLocal);
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      window.removeEventListener(QUESTION_PROGRESS_EVENT, onLocal);
    };
  }, [userId, year]);

  // Primary XP shown in the dashboard = local completed count (instant), fallback to cloud year XP.
  const xp = completed || yearXp;

  if (!local) {
    return (
      <>
        <div className="rounded-2xl bg-card border p-6 text-center space-y-3">
          <h3 className="text-lg font-semibold">Your Progress</h3>
          <p className="text-sm text-muted-foreground">
            Set up your profile to track progress, build daily streaks, and climb the leaderboard.
          </p>
          <Button onClick={() => setNeedsOnboarding(true)}>Get started</Button>
        </div>
        <OnboardingDialog
          open={needsOnboarding}
          onClose={() => setNeedsOnboarding(false)}
          onSave={(name, year) => saveProfile({ display_name: name, year })}
        />
      </>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Dr. {local.display_name}</h3>
          <p className="text-xs text-muted-foreground">{YEAR_LABELS[local.year]}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" />
        </Button>
      </div>

      <GoogleSyncButton isAnonymous={isAnonymous} email={email} onSignOut={signOut} />

      <YearRingCard completed={completed} total={total} />
      <div data-tour="streak-xp-card"><StreakXPCard xp={xp} lifetimeXp={lifetimeXp} streak={streak} /></div>
      <StreakTipsCard xp={xp} streak={streak} />
      <div data-tour="rewards-shelf"><RewardsShelf xp={xp} streak={streak} /></div>
      <div data-tour="leaderboard"><Leaderboard year={year} currentUserId={userId} enabled={!!userId} /></div>
      <SubjectsList year={year} />

      <OnboardingDialog
        open={editOpen}
        initialName={local.display_name}
        initialYear={local.year}
        onClose={() => setEditOpen(false)}
        onSave={(name, year) => saveProfile({ display_name: name, year })}
        title="Edit profile"
      />
    </div>
  );
};

export default ProgressDashboard;
