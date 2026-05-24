import { useState, useEffect, useRef, useCallback } from 'react';

export type PomodoroMode = 'focus' | 'short' | 'long';

interface UsePomodoroTimerOptions {
  focusMinutes: number;
  shortMinutes: number;
  longMinutes: number;
  longEvery: number;
  onComplete?: (mode: PomodoroMode, nextMode: PomodoroMode, completedMinutes: number) => void;
}

export function usePomodoroTimer(opts: UsePomodoroTimerOptions) {
  const { focusMinutes, shortMinutes, longMinutes, longEvery, onComplete } = opts;

  const [mode, setMode] = useState<PomodoroMode>('focus');
  const [pomodoroCount, setPomodoroCount] = useState(0); // completed focus sessions in current cycle
  const [minutes, setMinutes] = useState(focusMinutes);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(focusMinutes.toString());
  const [waterCount, setWaterCount] = useState(0);
  const [totalTime, setTotalTime] = useState(focusMinutes * 60);
  const [remainingTime, setRemainingTime] = useState(focusMinutes * 60);
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    setRemainingTime(minutes * 60 + seconds);
  }, [minutes, seconds]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    if (isRunning) {
      intervalId = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            if (intervalId) clearInterval(intervalId);
            setIsRunning(false);
            setMinutes(0);
            setSeconds(0);

            // Compute next mode based on current mode
            setMode(currentMode => {
              // Use the actual session length (handles inline-edited durations)
              const completedMins = Math.max(1, Math.round(totalTime / 60));
              let nextMode: PomodoroMode = 'focus';
              if (currentMode === 'focus') {
                setPomodoroCount(prevCount => {
                  const newCount = prevCount + 1;
                  nextMode = newCount % longEvery === 0 ? 'long' : 'short';
                  // Fire callback after state updates settle
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

              // Reset display to next mode's duration
              const nextMins = minutesForMode(nextMode);
              setMinutes(nextMins);
              setSeconds(0);
              setTotalTime(nextMins * 60);
              setRemainingTime(nextMins * 60);
              setInputValue(nextMins.toString());

              return nextMode;
            });

            return 0;
          }

          const newRemaining = prev - 1;
          setMinutes(Math.floor(newRemaining / 60));
          setSeconds(newRemaining % 60);
          return newRemaining;
        });
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRunning, longEvery, minutesForMode]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const toggleTimer = useCallback(() => {
    setIsRunning(prev => !prev);
  }, []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    const mins = parseInt(inputValue, 10) || minutesForMode(mode);
    setMinutes(mins);
    setSeconds(0);
    setTotalTime(mins * 60);
    setRemainingTime(mins * 60);
  }, [inputValue, mode, minutesForMode]);

  const switchMode = useCallback(
    (newMode: PomodoroMode) => {
      setIsRunning(false);
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
    handleInputChange,
    handleSubmit,
    startEditing,
    handleKeyDown,
  };
}
