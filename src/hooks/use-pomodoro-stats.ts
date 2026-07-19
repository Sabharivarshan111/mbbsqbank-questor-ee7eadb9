import { useCallback, useEffect, useState } from 'react';

const KEY = 'pomodoro:stats';

type StatsMap = Record<string, number>; // ISO date -> minutes focused

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readStats(): StatsMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StatsMap;
    // prune entries older than 30 days
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const out: StatsMap = {};
    for (const [date, mins] of Object.entries(parsed)) {
      if (new Date(date).getTime() >= cutoff) out[date] = mins;
    }
    return out;
  } catch {
    return {};
  }
}

function writeStats(stats: StatsMap) {
  try {
    localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    /* ignore */
  }
}

function sumAll(stats: StatsMap): number {
  return Object.values(stats).reduce((a, b) => a + (b || 0), 0);
}

export function usePomodoroStats() {
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [lifetimeMinutes, setLifetimeMinutes] = useState(0);

  useEffect(() => {
    const stats = readStats();
    setTodayMinutes(stats[todayKey()] ?? 0);
    setLifetimeMinutes(sumAll(stats));
  }, []);

  const addFocusMinutes = useCallback((mins: number) => {
    const stats = readStats();
    const key = todayKey();
    stats[key] = (stats[key] ?? 0) + mins;
    writeStats(stats);
    setTodayMinutes(stats[key]);
    setLifetimeMinutes(sumAll(stats));
  }, []);

  return { todayMinutes, lifetimeMinutes, addFocusMinutes };
}

export function formatFocusTime(mins: number): string {
  if (mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
