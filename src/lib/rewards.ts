// Client-side reward tracking. No schema changes needed.

export interface BadgeDef {
  id: string;
  kind: "xp" | "streak";
  threshold: number;
  label: string;
  emoji: string;
  tier: "bronze" | "silver" | "gold" | "platinum" | "diamond" | "legendary";
}

export const XP_BADGES: BadgeDef[] = [
  { id: "xp-10",   kind: "xp", threshold: 10,   label: "Bronze Scholar",   emoji: "🥉", tier: "bronze" },
  { id: "xp-50",   kind: "xp", threshold: 50,   label: "Silver Scholar",   emoji: "🥈", tier: "silver" },
  { id: "xp-100",  kind: "xp", threshold: 100,  label: "Gold Scholar",     emoji: "🥇", tier: "gold" },
  { id: "xp-250",  kind: "xp", threshold: 250,  label: "Platinum Mind",    emoji: "💠", tier: "platinum" },
  { id: "xp-500",  kind: "xp", threshold: 500,  label: "Diamond Mind",     emoji: "💎", tier: "diamond" },
  { id: "xp-1000", kind: "xp", threshold: 1000, label: "Legendary Healer", emoji: "👑", tier: "legendary" },
];

export const STREAK_BADGES: BadgeDef[] = [
  { id: "streak-3",   kind: "streak", threshold: 3,   label: "Spark",       emoji: "🔥", tier: "bronze" },
  { id: "streak-7",   kind: "streak", threshold: 7,   label: "Blaze",       emoji: "🔥", tier: "silver" },
  { id: "streak-14",  kind: "streak", threshold: 14,  label: "Inferno",     emoji: "🔥", tier: "gold" },
  { id: "streak-30",  kind: "streak", threshold: 30,  label: "Wildfire",    emoji: "🔥", tier: "platinum" },
  { id: "streak-100", kind: "streak", threshold: 100, label: "Eternal Flame", emoji: "🔥", tier: "legendary" },
];

export const ALL_BADGES = [...XP_BADGES, ...STREAK_BADGES];

const LS_KEY = "orbit-rewards-v1";

interface RewardsState {
  unlocked: Record<string, string>; // badge id -> ISO date
  lastLevel: number;
  lastStreakMilestone: number;
}

function read(): RewardsState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { unlocked: {}, lastLevel: 1, lastStreakMilestone: 0, ...JSON.parse(raw) };
  } catch {}
  return { unlocked: {}, lastLevel: 1, lastStreakMilestone: 0 };
}

function write(s: RewardsState) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
}

export function getRewardsState() { return read(); }

export function isUnlocked(badgeId: string): boolean {
  return !!read().unlocked[badgeId];
}

export interface NewUnlocks {
  badges: BadgeDef[];
  leveledUp: number | null; // new level if leveled up
  streakMilestone: number | null;
}

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

export function detectNewUnlocks(xp: number, streak: number): NewUnlocks {
  const state = read();
  const newBadges: BadgeDef[] = [];
  for (const b of XP_BADGES) {
    if (xp >= b.threshold && !state.unlocked[b.id]) newBadges.push(b);
  }
  for (const b of STREAK_BADGES) {
    if (streak >= b.threshold && !state.unlocked[b.id]) newBadges.push(b);
  }

  const newLevel = Math.floor(xp / 50) + 1;
  const leveledUp = newLevel > state.lastLevel ? newLevel : null;

  let streakMilestone: number | null = null;
  for (const m of STREAK_MILESTONES) {
    if (streak >= m && state.lastStreakMilestone < m) streakMilestone = m;
  }

  return { badges: newBadges, leveledUp, streakMilestone };
}

export function commitUnlocks(unlocks: NewUnlocks, xp: number, streak: number) {
  const state = read();
  const now = new Date().toISOString();
  for (const b of unlocks.badges) state.unlocked[b.id] = now;
  if (unlocks.leveledUp) state.lastLevel = unlocks.leveledUp;
  if (unlocks.streakMilestone) state.lastStreakMilestone = unlocks.streakMilestone;
  write(state);
}

// Compute current global XP from localStorage (each "true" question = 1 XP).
export function readLocalXp(): number {
  let n = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("question-") && localStorage.getItem(k) === "true") n++;
    }
  } catch {}
  return n;
}
