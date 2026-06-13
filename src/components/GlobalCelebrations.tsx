import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/use-profile";
import { useXpStream } from "@/hooks/use-xp-stream";
import CelebrationOverlay, { type CelebrationEvent } from "@/components/progress/CelebrationOverlay";
import { QUESTION_PROGRESS_EVENT } from "@/lib/question-progress";
import { readLocalXp } from "@/lib/rewards";

/**
 * Mounted once at app root so XP / streak / badge celebrations and
 * toasts fire on every screen (Home, Essay, Short Notes, Progress…).
 */
const GlobalCelebrations = () => {
  const { local, cloud, userId } = useProfile();
  const [queue, setQueue] = useState<CelebrationEvent[]>([]);
  const [active, setActive] = useState<CelebrationEvent | null>(null);
  const [, force] = useState(0);

  useEffect(() => {
    const h = () => force((n) => n + 1);
    window.addEventListener(QUESTION_PROGRESS_EVENT, h);
    return () => window.removeEventListener(QUESTION_PROGRESS_EVENT, h);
  }, []);

  useEffect(() => {
    if (!active && queue.length > 0) {
      const [next, ...rest] = queue;
      setActive(next);
      setQueue(rest);
    }
  }, [active, queue]);

  useXpStream({
    userId,
    cloudXp: Math.max(cloud?.xp ?? 0, readLocalXp()),
    cloudStreak: cloud?.streak ?? 0,
    displayName: local?.display_name,
    onCelebrate: (ev) => {
      setQueue((q) => [...q, { ...ev, id: Date.now() + Math.random() }]);
    },
    onXpDelta: () => {},
  });

  return <CelebrationOverlay event={active} onClose={() => setActive(null)} />;
};

export default GlobalCelebrations;
