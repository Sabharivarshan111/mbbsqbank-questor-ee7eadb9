import React, { createContext, useCallback, useContext } from 'react';
import { usePomodoroTimer, type PomodoroMode } from './use-pomodoro-timer';
import { usePomodoroSettings, defaultPomodoroSettings } from './use-pomodoro-settings';
import { usePomodoroStats } from './use-pomodoro-stats';
import { playSound, vibrate } from '@/lib/timer-sounds';
import { toast } from '@/components/ui/use-toast';

type Ctx = ReturnType<typeof usePomodoroTimer> & {
  settings: ReturnType<typeof usePomodoroSettings>['settings'];
  updateSettings: ReturnType<typeof usePomodoroSettings>['update'];
  todayMinutes: number;
  lifetimeMinutes: number;
  factoryReset: () => void;
};

const PomodoroCtx = createContext<Ctx | null>(null);

const MODE_EMOJI: Record<PomodoroMode, string> = { focus: '🍅', short: '☕', long: '🌿' };

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const { settings, update: updateSettings } = usePomodoroSettings();
  const { todayMinutes, lifetimeMinutes, addFocusMinutes } = usePomodoroStats();

  const handleComplete = useCallback(
    (completed: PomodoroMode, next: PomodoroMode, completedMins: number) => {
      if (completed === 'focus') addFocusMinutes(completedMins);
      if (settings.sound !== 'off') playSound(settings.sound, settings.volume);
      if (settings.vibrate) vibrate(completed === 'focus' ? [200, 100, 200] : [120]);
      const messages: Record<PomodoroMode, string> = {
        focus: `Focus done! Take a ${next === 'long' ? 'long' : 'short'} break ${MODE_EMOJI[next]}`,
        short: 'Break over — back to focus 🍅',
        long: 'Long break over — back to focus 🍅',
      };
      toast({ title: "Time's up!", description: messages[completed] });
    },
    [addFocusMinutes, settings.sound, settings.volume, settings.vibrate],
  );

  const timer = usePomodoroTimer({
    focusMinutes: settings.focus,
    shortMinutes: settings.short,
    longMinutes: settings.long,
    longEvery: settings.longEvery,
    onComplete: handleComplete,
  });

  const factoryReset = useCallback(() => {
    updateSettings(defaultPomodoroSettings);
    timer.resetCycle();
  }, [updateSettings, timer]);

  const value: Ctx = { ...timer, settings, updateSettings, todayMinutes, factoryReset };
  return <PomodoroCtx.Provider value={value}>{children}</PomodoroCtx.Provider>;
}

export function usePomodoroCtx() {
  const c = useContext(PomodoroCtx);
  if (!c) throw new Error('usePomodoroCtx must be used inside PomodoroProvider');
  return c;
}
