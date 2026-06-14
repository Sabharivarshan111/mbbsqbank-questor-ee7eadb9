import { useState, useEffect, useRef, useCallback } from 'react';

export type PomodoroMode = 'focus' | 'short' | 'long';

interface UsePomodoroTimerOptions {
  focusMinutes: number;
  shortMinutes: number;
  longMinutes: number;
  longEvery: number;
  onComplete?: (mode: PomodoroMode, nextMode: PomodoroMode, completedMinutes: number) => void;
}

const STORAGE_KEY = 'pomodoro:session';

type PersistedSession = {
  mode: PomodoroMode;
  totalTime: number;
  endsAt: number;
  pomodoroCount: number;
};

function readPersisted(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PersistedSession;
    if (!p || typeof p.endsAt !== 'number') return null;
    return p;
  } catch {
    return null;
  }
}

function writePersisted(s: PersistedSession) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function clearPersisted() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function usePomodoroTimer(opts: UsePomodoroTimerOptions) {
  const { focusMinutes, shortMinutes, longMinutes, longEvery, onComplete } = opts;

  // Restore from persistence on first render so the user sees the correct state immediately.
  const initial = (() => {
    const p = readPersisted();
    if (!p) return null;
    const remaining = Math.ceil((p.endsAt - Date.now()) / 1000);
    return { ...p, remaining };
  })();

  const [mode, setMode] = useState<PomodoroMode>(initial?.mode ?? 'focus');
  const [pomodoroCount, setPomodoroCount] = useState(initial?.pomodoroCount ?? 0);
  const startMins = initial ? Math.max(0, Math.floor((initial.remaining > 0 ? initial.remaining : 0) / 60)) : focusMinutes;
  const startSecs = initial ? Math.max(0, (initial.remaining > 0 ? initial.remaining : 0) % 60) : 0;
  const [minutes, setMinutes] = useState(startMins);
  const [seconds, setSeconds] = useState(startSecs);
  const [isRunning, setIsRunning] = useState(initial ? initial.remaining > 0 : false);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState((initial ? Math.max(1, Math.round(initial.totalTime / 60)) : focusMinutes).toString());
  const [waterCount, setWaterCount] = useState(0);
  const [totalTime, setTotalTime] = useState(initial?.totalTime ?? focusMinutes * 60);
  const [remainingTime, setRemainingTime] = useState(initial ? Math.max(0, initial.remaining) : focusMinutes * 60);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ref for wall-clock based ticking
  const runStartRef = useRef<{ startedAt: number; startRemaining: number } | null>(
    initial && initial.remaining > 0
      ? { startedAt: Date.now(), startRemaining: initial.remaining }
      : null,
  );

  // Keep a ref to onComplete so the interval effect doesn't re-run on every prop change
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const minutesForMode = useCallback(
    (m: PomodoroMode) => {
      if (m === 'focus') return focusMinutes;
      if (m === 'short') return shortMinutes;
      return longMinutes;
    },
    [focusMinutes, shortMinutes, longMinutes],
  );

  // If the user changes durations while idle on a given mode, reflect it
  useEffect(() => {
    if (!isRunning && !isEditing) {
      const mins = minutesForMode(mode);
      setMinutes(mins);
      setSeconds(0);
      setTotalTime(mins * 60);
      setRemainingTime(mins * 60);
      setInputValue(mins.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMinutes, shortMinutes, longMinutes, mode]);

  // Handle completion (shared by interval, visibility listener, and restored-expired sessions)
  const completeSession = useCallback(() => {
    runStartRef.current = null;
    clearPersisted();
    setIsRunning(false);
    setMinutes(0);
    setSeconds(0);
    setRemainingTime(0);

    setMode(currentMode => {
      const completedMins = Math.max(1, Math.round(totalTime / 60));
      let nextMode: PomodoroMode = 'focus';
      if (currentMode === 'focus') {
        setPomodoroCount(prevCount => {
          const newCount = prevCount + 1;
          nextMode = newCount % longEvery === 0 ? 'long' : 'short';
          queueMicrotask(() => {
            onCompleteRef.current?.(currentMode, nextMode, completedMins);
          });
          return newCount;
        });
      } else {
        nextMode = 'focus';
        queueMicrotask(() => {
          onCompleteRef.current?.(currentMode, nextMode, completedMins);
        });
      }

      const nextMins = minutesForMode(nextMode);
      setMinutes(nextMins);
      setSeconds(0);
      setTotalTime(nextMins * 60);
      setRemainingTime(nextMins * 60);
      setInputValue(nextMins.toString());

      return nextMode;
    });
  }, [totalTime, longEvery, minutesForMode]);

  // On mount: if persisted session already expired while app was closed, fire completion once.
  useEffect(() => {
    if (initial && initial.remaining <= 0) {
      completeSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wall-clock interval tick
  useEffect(() => {
    if (!isRunning) return undefined;

    const tick = () => {
      const ref = runStartRef.current;
      if (!ref) return;
      const elapsed = Math.floor((Date.now() - ref.startedAt) / 1000);
      const newRemaining = ref.startRemaining - elapsed;
      if (newRemaining <= 0) {
        completeSession();
        return;
      }
      setRemainingTime(newRemaining);
      setMinutes(Math.floor(newRemaining / 60));
      setSeconds(newRemaining % 60);
    };

    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [isRunning, completeSession]);


  // Visibility listener: snap immediately on return
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      if (!isRunning) return;
      const ref = runStartRef.current;
      if (!ref) return;
      const elapsed = Math.floor((Date.now() - ref.startedAt) / 1000);
      const newRemaining = ref.startRemaining - elapsed;
      if (newRemaining <= 0) {
        completeSession();
      } else {
        setRemainingTime(newRemaining);
        setMinutes(Math.floor(newRemaining / 60));
        setSeconds(newRemaining % 60);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [isRunning, completeSession]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const toggleTimer = useCallback(() => {
    setIsRunning(prev => {
      const next = !prev;
      if (next) {
        // Starting / resuming
        runStartRef.current = { startedAt: Date.now(), startRemaining: remainingTime };
        writePersisted({
          mode,
          totalTime,
          endsAt: Date.now() + remainingTime * 1000,
          pomodoroCount,
        });
      } else {
        // Pausing
        runStartRef.current = null;
        clearPersisted();
      }
      return next;
    });
  }, [remainingTime, mode, totalTime, pomodoroCount]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    runStartRef.current = null;
    clearPersisted();
    const mins = parseInt(inputValue, 10) || minutesForMode(mode);
    setMinutes(mins);
    setSeconds(0);
    setTotalTime(mins * 60);
    setRemainingTime(mins * 60);
  }, [inputValue, mode, minutesForMode]);

  const switchMode = useCallback(
    (newMode: PomodoroMode) => {
      setIsRunning(false);
      runStartRef.current = null;
      clearPersisted();
      setMode(newMode);
      const mins = minutesForMode(newMode);
      setMinutes(mins);
      setSeconds(0);
      setTotalTime(mins * 60);
      setRemainingTime(mins * 60);
      setInputValue(mins.toString());
    },
    [minutesForMode],
  );

  const resetCycle = useCallback(() => {
    setPomodoroCount(0);
    switchMode('focus');
  }, [switchMode]);

  const applyCurrentSettings = useCallback(() => {
    setIsRunning(false);
    runStartRef.current = null;
    clearPersisted();
    setIsEditing(false);
    const mins = minutesForMode(mode);
    setMinutes(mins);
    setSeconds(0);
    setTotalTime(mins * 60);
    setRemainingTime(mins * 60);
    setInputValue(mins.toString());
  }, [mode, minutesForMode]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setInputValue(value);
    }
  }, []);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const fallback = minutesForMode(mode);
      const newMinutes = inputValue === '' ? fallback : parseInt(inputValue, 10);
      const validMinutes = Math.min(Math.max(1, newMinutes), 99);
      runStartRef.current = null;
      clearPersisted();
      setMinutes(validMinutes);
      setSeconds(0);
      setTotalTime(validMinutes * 60);
      setRemainingTime(validMinutes * 60);
      setInputValue(validMinutes.toString());
      setIsEditing(false);
    },
    [inputValue, mode, minutesForMode],
  );

  const startEditing = useCallback(() => {
    if (!isRunning) {
      setIsEditing(true);
      setInputValue(minutes.toString());
    }
  }, [isRunning, minutes]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSubmit();
      } else if (e.key === 'Escape') {
        setIsEditing(false);
        setInputValue(minutes.toString());
      }
    },
    [handleSubmit, minutes],
  );

  const progressPercentage =
    totalTime > 0 ? Math.max(0, Math.min(100, (remainingTime / totalTime) * 100)) : 0;

  return {
    mode,
    pomodoroCount,
    minutes,
    seconds,
    isRunning,
    isEditing,
    inputValue,
    setInputValue,
    waterCount,
    totalTime,
    remainingTime,
    progressPercentage,
    inputRef,
    setWaterCount,
    toggleTimer,
    resetTimer,
    switchMode,
    resetCycle,
    applyCurrentSettings,
    handleInputChange,
    handleSubmit,
    startEditing,
    handleKeyDown,
  };
}
