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
import CelebrationOverlay, { type CelebrationEvent } from "./CelebrationOverlay";
import { getYearNode, YEAR_LABELS } from "@/lib/year-subjects";
import { collectQuestions, countDone, QUESTION_PROGRESS_EVENT } from "@/lib/question-progress";
import { useXpStream } from "@/hooks/use-xp-stream";
import { readLocalXp } from "@/lib/rewards";

const ProgressDashboard = () => {
  const { local, cloud, userId, email, isAnonymous, needsOnboarding, saveProfile, setNeedsOnboarding, signOut } = useProfile();
  const [editOpen, setEditOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const [celebrationQueue, setCelebrationQueue] = useState<CelebrationEvent[]>([]);
  const [activeCelebration, setActiveCelebration] = useState<CelebrationEvent | null>(null);

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

  const xp = Math.max(cloud?.xp ?? 0, readLocalXp(), completed);
  const streak = cloud?.streak ?? 0;

  // Drain queue when no active celebration
  useEffect(() => {
    if (!activeCelebration && celebrationQueue.length > 0) {
      const [next, ...rest] = celebrationQueue;
      setActiveCelebration(next);
      setCelebrationQueue(rest);
    }
  }, [activeCelebration, celebrationQueue]);

  useXpStream({
    userId,
    cloudXp: cloud?.xp ?? 0,
    cloudStreak: streak,
    displayName: local?.display_name,
    onCelebrate: (ev) => {
      setCelebrationQueue((q) => [...q, { ...ev, id: Date.now() + Math.random() }]);
    },
    onXpDelta: () => {},
  });

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
      <StreakXPCard xp={xp} streak={streak} />
      <StreakTipsCard xp={xp} streak={streak} />
      <RewardsShelf xp={xp} streak={streak} />
      <Leaderboard year={year} currentUserId={userId} enabled={!!userId} />
      <SubjectsList year={year} />

      <OnboardingDialog
        open={editOpen}
        initialName={local.display_name}
        initialYear={local.year}
        onClose={() => setEditOpen(false)}
        onSave={(name, year) => saveProfile({ display_name: name, year })}
        title="Edit profile"
      />

      <CelebrationOverlay event={activeCelebration} onClose={() => setActiveCelebration(null)} />
    </div>
  );
};

export default ProgressDashboard;
