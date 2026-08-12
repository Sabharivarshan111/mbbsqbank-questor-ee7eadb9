import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PomodoroMode = 'focus' | 'short' | 'long';

export interface PomodoroSettings {
  focusMinutes: number;
  shortMinutes: number;
  longMinutes: number;
  longEvery: number;
}

export const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortMinutes: 5,
  longMinutes: 15,
  longEvery: 4,
};

const SESSION_KEY = 'pomodoro:session';
const SETTINGS_KEY = 'pomodoro:settings';
const FOCUS_TOTAL_KEY = 'pomodoro:focus-minutes-total';
const FOCUS_TODAY_KEY = 'pomodoro:focus-today';

/** Local calendar day, so "today" rolls over at the user's midnight. */
function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

interface PersistedSession {
  mode: PomodoroMode;
  totalSeconds: number;
  endsAt: number;
  completedFocus: number;
}

export const MODE_LABEL: Record<PomodoroMode, string> = {
  focus: 'Focus',
  short: 'Short Break',
  long: 'Long Break',
};

/**
 * A wall-clock pomodoro. The deadline is stored as an absolute timestamp, so
 * backgrounding the app, locking the screen, or killing the JS timer does not
 * drift the countdown — remaining time is always recomputed from Date.now().
 */
export function usePomodoro() {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [mode, setMode] = useState<PomodoroMode>('focus');
  const [totalSeconds, setTotalSeconds] = useState(DEFAULT_SETTINGS.focusMinutes * 60);
  const [remaining, setRemaining] = useState(DEFAULT_SETTINGS.focusMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedFocus, setCompletedFocus] = useState(0);
  const [focusMinutesTotal, setFocusMinutesTotal] = useState(0);
  const [focusMinutesToday, setFocusMinutesToday] = useState(0);

  const endsAtRef = useRef<number | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const minutesFor = useCallback((next: PomodoroMode, from: PomodoroSettings) => {
    if (next === 'focus') {
      return from.focusMinutes;
    }
    return next === 'short' ? from.shortMinutes : from.longMinutes;
  }, []);

  // Restore settings, lifetime focus minutes, and any in-flight session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getMany([
          SETTINGS_KEY,
          SESSION_KEY,
          FOCUS_TOTAL_KEY,
          FOCUS_TODAY_KEY,
        ]);
        if (cancelled) {
          return;
        }
        const rawSettings = stored[SETTINGS_KEY];
        const rawSession = stored[SESSION_KEY];
        const rawTotal = stored[FOCUS_TOTAL_KEY];
        const rawToday = stored[FOCUS_TODAY_KEY];

        if (rawToday) {
          const parsed = JSON.parse(rawToday) as { date: string; minutes: number };
          // Yesterday's total does not carry over.
          if (parsed.date === todayKey()) {
            setFocusMinutesToday(parsed.minutes || 0);
          }
        }

        let active = DEFAULT_SETTINGS;
        if (rawSettings) {
          active = { ...DEFAULT_SETTINGS, ...(JSON.parse(rawSettings) as PomodoroSettings) };
          setSettings(active);
        }
        if (rawTotal) {
          setFocusMinutesTotal(Number(rawTotal) || 0);
        }
        if (rawSession) {
          const session = JSON.parse(rawSession) as PersistedSession;
          const left = Math.round((session.endsAt - Date.now()) / 1000);
          setMode(session.mode);
          setTotalSeconds(session.totalSeconds);
          setCompletedFocus(session.completedFocus);
          if (left > 0) {
            endsAtRef.current = session.endsAt;
            setRemaining(left);
            setIsRunning(true);
            return;
          }
          // Session elapsed while the app was closed.
          setRemaining(0);
          await AsyncStorage.removeItem(SESSION_KEY);
          return;
        }
        setTotalSeconds(minutesFor('focus', active) * 60);
        setRemaining(minutesFor('focus', active) * 60);
      } catch (error) {
        console.warn('pomodoro restore failed:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [minutesFor]);

  const finishSession = useCallback(() => {
    setIsRunning(false);
    endsAtRef.current = null;
    AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
    Vibration.vibrate([0, 400, 200, 400]);

    setMode(current => {
      if (current !== 'focus') {
        const next = settingsRef.current.focusMinutes * 60;
        setTotalSeconds(next);
        setRemaining(next);
        return 'focus';
      }

      const done = completedFocus + 1;
      setCompletedFocus(done);
      setFocusMinutesTotal(prev => {
        const updated = prev + settingsRef.current.focusMinutes;
        AsyncStorage.setItem(FOCUS_TOTAL_KEY, String(updated)).catch(() => {});
        return updated;
      });
      setFocusMinutesToday(prev => {
        const updated = prev + settingsRef.current.focusMinutes;
        AsyncStorage.setItem(
          FOCUS_TODAY_KEY,
          JSON.stringify({ date: todayKey(), minutes: updated }),
        ).catch(() => {});
        return updated;
      });

      const nextMode: PomodoroMode =
        done % settingsRef.current.longEvery === 0 ? 'long' : 'short';
      const nextSeconds = minutesFor(nextMode, settingsRef.current) * 60;
      setTotalSeconds(nextSeconds);
      setRemaining(nextSeconds);
      return nextMode;
    });
  }, [completedFocus, minutesFor]);

  const syncFromClock = useCallback(() => {
    if (endsAtRef.current == null) {
      return;
    }
    const left = Math.round((endsAtRef.current - Date.now()) / 1000);
    if (left <= 0) {
      setRemaining(0);
      finishSession();
    } else {
      setRemaining(left);
    }
  }, [finishSession]);

  // Tick once per second while running.
  useEffect(() => {
    if (!isRunning) {
      return;
    }
    const id = setInterval(syncFromClock, 1000);
    return () => clearInterval(id);
  }, [isRunning, syncFromClock]);

  // Re-sync the moment the app returns to the foreground.
  useEffect(() => {
    const handler = (state: AppStateStatus) => {
      if (state === 'active') {
        syncFromClock();
      }
    };
    const subscription = AppState.addEventListener('change', handler);
    return () => subscription.remove();
  }, [syncFromClock]);

  const persistSession = useCallback(
    (endsAt: number, currentMode: PomodoroMode, total: number, focusCount: number) => {
      const session: PersistedSession = {
        mode: currentMode,
        totalSeconds: total,
        endsAt,
        completedFocus: focusCount,
      };
      AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session)).catch(() => {});
    },
    [],
  );

  const start = useCallback(() => {
    const seconds = remaining > 0 ? remaining : totalSeconds;
    const endsAt = Date.now() + seconds * 1000;
    endsAtRef.current = endsAt;
    setRemaining(seconds);
    setIsRunning(true);
    persistSession(endsAt, mode, totalSeconds, completedFocus);
  }, [remaining, totalSeconds, mode, completedFocus, persistSession]);

  const pause = useCallback(() => {
    syncFromClock();
    setIsRunning(false);
    endsAtRef.current = null;
    AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
  }, [syncFromClock]);

  const reset = useCallback(() => {
    const seconds = minutesFor(mode, settingsRef.current) * 60;
    setIsRunning(false);
    endsAtRef.current = null;
    setTotalSeconds(seconds);
    setRemaining(seconds);
    AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
  }, [mode, minutesFor]);

  const switchMode = useCallback(
    (next: PomodoroMode) => {
      const seconds = minutesFor(next, settingsRef.current) * 60;
      setIsRunning(false);
      endsAtRef.current = null;
      setMode(next);
      setTotalSeconds(seconds);
      setRemaining(seconds);
      AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
    },
    [minutesFor],
  );

  const updateSettings = useCallback(
    (next: Partial<PomodoroSettings>) => {
      setSettings(prev => {
        const merged = { ...prev, ...next };
        settingsRef.current = merged;
        AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(merged)).catch(() => {});
        if (!isRunning) {
          const seconds = minutesFor(mode, merged) * 60;
          setTotalSeconds(seconds);
          setRemaining(seconds);
        }
        return merged;
      });
    },
    [isRunning, mode, minutesFor],
  );

  return {
    mode,
    modeLabel: MODE_LABEL[mode],
    remaining,
    totalSeconds,
    isRunning,
    completedFocus,
    focusMinutesTotal,
    focusMinutesToday,
    settings,
    start,
    pause,
    reset,
    switchMode,
    updateSettings,
  };
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
