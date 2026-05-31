import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
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
import { useLongPressDrag } from '@/hooks/use-long-press-drag';

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
  const theme = rawTheme === 'custom' ? 'dark' : rawTheme;
  const [isVisible, setIsVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  const pillRef = useRef<HTMLDivElement>(null);
  const miniCircleRef = useRef<HTMLDivElement>(null);
  const { position, isDragging, handlers } = useLongPressDrag(pillRef);
  const isLiquidGlass = theme === 'liquid-glass';
  const [liquidViewport, setLiquidViewport] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [floatingSize, setFloatingSize] = useState({ width: 0, height: 0 });

  const toggleVisibility = () => setIsVisible(prev => !prev);

  const updateLiquidViewport = useCallback(() => {
    if (typeof window === 'undefined') return;
    const viewport = window.visualViewport;
    setLiquidViewport({
      x: window.scrollX + (viewport?.offsetLeft ?? 0),
      y: window.scrollY + (viewport?.offsetTop ?? 0),
      width: viewport?.width ?? window.innerWidth,
      height: viewport?.height ?? window.innerHeight,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isLiquidGlass) return;
    updateLiquidViewport();
    const viewport = window.visualViewport;
    window.addEventListener('scroll', updateLiquidViewport, { passive: true });
    window.addEventListener('resize', updateLiquidViewport);
    viewport?.addEventListener('scroll', updateLiquidViewport);
    viewport?.addEventListener('resize', updateLiquidViewport);
    return () => {
      window.removeEventListener('scroll', updateLiquidViewport);
      window.removeEventListener('resize', updateLiquidViewport);
      viewport?.removeEventListener('scroll', updateLiquidViewport);
      viewport?.removeEventListener('resize', updateLiquidViewport);
    };
  }, [isLiquidGlass, updateLiquidViewport]);

  useLayoutEffect(() => {
    if (!isLiquidGlass) return;
    const el = isVisible ? pillRef.current : miniCircleRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setFloatingSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isLiquidGlass, isVisible]);

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
    } else if (theme === 'liquid-glass') {
      return {
        background: 'bg-gradient-to-br from-white/75 via-white/55 to-blue-100/55 border border-white/60 backdrop-blur-2xl shadow-[0_8px_32px_rgba(31,38,135,0.18)]',
        text: 'text-slate-900',
        button: 'border-slate-900/30 text-slate-900 hover:bg-white/70',
        iconColor: 'text-slate-900',
        badge: 'bg-white/60 text-slate-800 border-white/70',
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

  const portalStyleReset: React.CSSProperties = {
    transition: 'none',
    willChange: 'auto',
  };

  const modeAccent =
    mode === 'short'
      ? 'text-sky-400'
      : mode === 'long'
        ? 'text-violet-400'
        : styles.text;

  const fixedDefaultStyle: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    right: 0,
    marginLeft: 'auto',
    marginRight: 'auto',
    width: 'max-content',
    maxWidth: '95vw',
    bottom: 'max(2.5rem, calc(env(safe-area-inset-bottom) + 1rem))',
    transform: 'none',
    zIndex: 2147483000,
    ...portalStyleReset,
  };

  const getLiquidViewportStyle = (heightFallback: number): React.CSSProperties => {
    const viewportWidth = liquidViewport.width || (typeof window !== 'undefined' ? window.innerWidth : 0);
    const viewportHeight = liquidViewport.height || (typeof window !== 'undefined' ? window.innerHeight : 0);
    const height = floatingSize.height || heightFallback;

    return {
      position: 'absolute',
      left: liquidViewport.x + viewportWidth / 2,
      top: liquidViewport.y + viewportHeight - height - 40,
      right: 'auto',
      bottom: 'auto',
      marginLeft: 0,
      marginRight: 0,
      width: 'max-content',
      maxWidth: '95vw',
      transform: 'translateX(-50%)',
      zIndex: 2147483000,
      ...portalStyleReset,
    };
  };

  const liquidPillDefaultStyle = getLiquidViewportStyle(144);
  const liquidMiniCircleStyle = getLiquidViewportStyle(40);

  const miniCircleStyle: React.CSSProperties = {
    ...(isLiquidGlass ? liquidMiniCircleStyle : fixedDefaultStyle),
    width: '2.5rem',
    height: '2.5rem',
  };


  const settingsSheet = (
    <PomodoroSettingsSheet
      open={settingsOpen}
      onOpenChange={setSettingsOpen}
      onResetCycle={resetCycle}
    />
  );

  const floatingPortalRoot = document.body;

  if (settingsOpen) {
    return settingsSheet;
  }

  if (!isVisible) {
    return (
      <>
        {createPortal(
          <div ref={miniCircleRef} style={miniCircleStyle} className="pomodoro-floating-default pomodoro-floating-mini animate-fade-in">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={toggleVisibility}
                    className={`h-full w-full rounded-full p-2 shadow-lg ${styles.background} ${styles.text}`}
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
          </div>,
          floatingPortalRoot,
        )}
      </>
    );
  }



  const positionStyle: React.CSSProperties = position
    ? {
        position: isLiquidGlass ? 'absolute' : 'fixed',
        left: isLiquidGlass ? liquidViewport.x + position.x : position.x,
        top: isLiquidGlass ? liquidViewport.y + position.y : position.y,
        bottom: 'auto',
        transform: 'none',
        zIndex: 2147483000,
        ...portalStyleReset,
      }
    : isLiquidGlass ? liquidPillDefaultStyle : fixedDefaultStyle;


  return createPortal(
    <div
      ref={pillRef}
      {...handlers}
      style={positionStyle}
      className={`${styles.background} ${position ? '' : 'pomodoro-floating-default'} rounded-2xl px-5 py-3 shadow-lg min-w-[320px] max-w-[95vw] animate-fade-in select-none touch-none ${isDragging ? 'cursor-grabbing scale-105 shadow-2xl ring-1 ring-white/30' : 'cursor-default'}`}
    >
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden z-10 flex items-center justify-center">
          <div className="absolute inset-0 backdrop-blur-2xl bg-white/20 dark:bg-white/10 border border-white/40 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(255,255,255,0.15)]" />
          <span className="relative text-xs font-medium tracking-wide text-foreground/90 drop-shadow-sm animate-pulse">
            ✦ Drag me anywhere ✦
          </span>
        </div>
      )}
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

            <Button
              variant="outline"
              size="icon"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setSettingsOpen(true);
              }}
              className={`h-8 w-8 rounded-full ${styles.button}`}
              aria-label="Pomodoro settings"
            >
              <Settings2 className="h-4 w-4" />
            </Button>



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
          {onlineCount !== null && onlineCount > 0 && (
            <span className="ml-2">• 👥 {onlineCount} studying now</span>
          )}
        </div>
      </div>
    </div>,
    floatingPortalRoot,
  );

};

export default PomodoroTimer;
