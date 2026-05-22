import { useLocalStorage } from './use-local-storage';
import type { SoundPreset } from '@/lib/timer-sounds';

export interface PomodoroSettings {
  focus: number;       // minutes
  short: number;       // minutes
  long: number;        // minutes
  longEvery: number;   // every N focus sessions
  sound: SoundPreset;
  volume: number;      // 0..1
  vibrate: boolean;
}

export const defaultPomodoroSettings: PomodoroSettings = {
  focus: 25,
  short: 5,
  long: 15,
  longEvery: 4,
  sound: 'bell',
  volume: 0.6,
  vibrate: true,
};

export function usePomodoroSettings() {
  const [settings, setSettings] = useLocalStorage<PomodoroSettings>(
    'pomodoro:settings',
    defaultPomodoroSettings,
  );

  const update = (patch: Partial<PomodoroSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }));
  };

  // Merge with defaults so newly-added keys don't blow up
  const merged: PomodoroSettings = { ...defaultPomodoroSettings, ...settings };

  return { settings: merged, update };
}
