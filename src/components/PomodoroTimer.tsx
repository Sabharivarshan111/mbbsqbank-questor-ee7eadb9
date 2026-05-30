import React, { useState, useEffect, useCallback } from 'react';
import { Timer, X, Settings2 } from 'lucide-react';
import { usePomodoroTimer, type PomodoroMode } from '@/hooks/use-pomodoro-timer';
import { usePomodoroSettings } from '@/hooks/use-pomodoro-settings';
import { usePomodoroStats, formatFocusTime } from '@/hooks/use-pomodoro-stats';
import { playSound, vibrate, primeAudio } from '@/lib/timer-sounds';
import { TimerControls } from './pomodoro/TimerControls';
import { TimerDisplay } from './pomodoro/TimerDisplay';
import { TimerProgress } from './pomodoro/TimerProgress';
import { PomodoroSettingsSheet } from './pomodoro/PomodoroSettingsSheet';
import { useTheme } from './theme/ThemeProvider';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useOnlinePresence } from '@/hooks/use-online-presence';
import { toast } from '@/components/ui/use-toast';

const MODE_LABEL: Record<PomodoroMode, string> = {
  focus: 'Focus',
  short: 'Short break',
  long: 'Long break',
};

const MODE_EMOJI: Record<PomodoroMode, string> = {
  focus: '🍅',
  short: '☕',
  long: '🌿',
};

const PomodoroTimer = () => {
  const { theme: rawTheme } = useTheme();
  const theme: 'dark' | 'light' | 'blackpink' = rawTheme === 'custom' ? 'dark' : rawTheme;
  const [isVisible, setIsVisible] = useState(true);
  const { settings } = usePomodoroSettings();
  const { todayMinutes, addFocusMinutes } = usePomodoroStats();
  const { onlineCount } = useOnlinePresence();

  const handleComplete = useCallback(
    (completed: PomodoroMode, next: PomodoroMode, completedMins: number) => {
      if (completed === 'focus') {
        addFocusMinutes(completedMins);
      }
      if (settings.sound !== 'off') {
        playSound(settings.sound, settings.volume);
      }
      if (settings.vibrate) {
        vibrate(completed === 'focus' ? [200, 100, 200] : [120]);
      }
      const messages: Record<PomodoroMode, string> = {
        focus: `Focus done! Take a ${next === 'long' ? 'long' : 'short'} break ${MODE_EMOJI[next]}`,
        short: 'Break over — back to focus 🍅',
        long: 'Long break over — back to focus 🍅',
      };
      toast({
        title: "Time's up!",
        description: messages[completed],
      });
    },
    [addFocusMinutes, settings.sound, settings.volume, settings.vibrate],
  );

  const {
    mode,
    pomodoroCount,
    minutes,
    seconds,
    isRunning,
    isEditing,
    inputValue,
    setInputValue,
    waterCount,
    progressPercentage,
    totalTime,
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
  } = usePomodoroTimer({
    focusMinutes: settings.focus,
    shortMinutes: settings.short,
    longMinutes: settings.long,
    longEvery: settings.longEvery,
    onComplete: handleComplete,
  });

  // Wrap toggleTimer so the first user gesture unlocks audio on mobile
  const handleToggle = useCallback(() => {
    primeAudio();
    toggleTimer();
  }, [toggleTimer]);

  useEffect(() => {
    const savedVisibility = localStorage.getItem('pomodoroVisible');
    if (savedVisibility !== null) {
      setIsVisible(savedVisibility === 'true');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pomodoroVisible', isVisible.toString());
  }, [isVisible]);

  const toggleVisibility = () => setIsVisible(prev => !prev);

  const getThemeStyles = () => {
    if (theme === 'blackpink') {
      return {
        background: 'bg-black border border-pink-500',
        text: 'text-pink-400',
        button: 'border-pink-500 text-pink-400 hover:bg-pink-500 hover:text-black',
        iconColor: 'text-pink-400',
        badge: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
      };
    } else if (theme === 'dark') {
      return {
        background: 'bg-black border border-white',
        text: 'text-white',
        button: 'border-white text-white hover:bg-white hover:text-black',
        iconColor: 'text-white',
        badge: 'bg-white/10 text-white border-white/30',
      };
    }
    return {
      background: 'bg-white border border-gray-300',
      text: 'text-gray-900',
      button: 'border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white',
      iconColor: 'text-gray-900',
      badge: 'bg-gray-900/5 text-gray-700 border-gray-300',
    };
  };

  const styles = getThemeStyles();

  const modeAccent =
    mode === 'short'
      ? 'text-sky-400'
      : mode === 'long'
        ? 'text-violet-400'
        : styles.text;

  if (!isVisible) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={toggleVisibility}
              className={`fixed bottom-10 left-1/2 transform -translate-x-1/2 rounded-full p-2 shadow-lg z-50 animate-fade-in ${styles.background} ${styles.text}`}
              size="icon"
              variant="outline"
              aria-label="Show Pomodoro timer"
            >
              <Timer className={`w-5 h-5 ${styles.iconColor}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Show Pomodoro timer</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div
      className={`fixed bottom-10 left-1/2 transform -translate-x-1/2 ${styles.background} rounded-2xl px-5 py-3 shadow-lg min-w-[320px] max-w-[95vw] z-50 animate-fade-in`}
    >
      <div className="space-y-2">
        {/* Mode + cycle badge row */}
        <div className="flex items-center justify-between text-[11px]">
          <button
            type="button"
            onClick={() => {
              const next: PomodoroMode =
                mode === 'focus' ? 'short' : mode === 'short' ? 'long' : 'focus';
              switchMode(next);
            }}
            className={`px-2 py-0.5 rounded-full border ${styles.badge} font-medium`}
            aria-label="Switch mode"
          >
            {MODE_EMOJI[mode]} {MODE_LABEL[mode]}
          </button>
          <span className={`opacity-80 ${styles.text}`}>
            {MODE_EMOJI.focus} {pomodoroCount % settings.longEvery}/{settings.longEvery}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Timer className={`w-5 h-5 ${styles.iconColor}`} />

          <div className={modeAccent}>
            <TimerDisplay
              isEditing={isEditing}
              isRunning={isRunning}
              minutes={minutes}
              seconds={seconds}
              inputValue={inputValue}
              setInputValue={setInputValue}
              startEditing={startEditing}
              handleInputChange={handleInputChange}
              handleKeyDown={handleKeyDown}
              handleSubmit={handleSubmit}
              inputRef={inputRef}
              theme={theme}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <TimerControls
              isRunning={isRunning}
              toggleTimer={handleToggle}
              resetTimer={resetTimer}
              waterCount={waterCount}
              setWaterCount={setWaterCount}
              theme={theme}
            />

            <PomodoroSettingsSheet
              onResetCycle={resetCycle}
              trigger={
                <Button
                  variant="outline"
                  size="icon"
                  className={`h-8 w-8 rounded-full ${styles.button}`}
                  aria-label="Pomodoro settings"
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              }
            />

            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleVisibility}
                    className={`h-8 w-8 rounded-full ${styles.button}`}
                    aria-label="Close Pomodoro timer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Close Pomodoro timer</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <TimerProgress
          progressPercentage={progressPercentage}
          totalTime={totalTime}
          waterCount={waterCount}
          theme={theme}
        />

        <div className={`text-center text-[11px] opacity-80 ${styles.text}`}>
          Today: {formatFocusTime(todayMinutes)} focused 🔥
          <span className="ml-2">• 👥 {Math.max(1, onlineCount)} studying now</span>
        </div>
      </div>
    </div>
  );
};

export default PomodoroTimer;
