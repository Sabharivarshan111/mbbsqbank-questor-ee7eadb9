import AsyncStorage from '@react-native-async-storage/async-storage';

const FOCUS_TOTAL_KEY = 'pomodoro:focus-minutes-total';

/** Lifetime focused minutes, written by usePomodoro when a focus block ends. */
export async function readFocusMinutes(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(FOCUS_TOTAL_KEY);
    return Number(raw) || 0;
  } catch {
    return 0;
  }
}

/** Identical to formatFocusTime in src/hooks/use-pomodoro-stats.ts. */
export function formatFocusTime(mins: number): string {
  if (mins <= 0) {
    return '0m';
  }
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}
