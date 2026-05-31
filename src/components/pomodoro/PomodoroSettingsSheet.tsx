import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Settings2, Volume2, Play } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { usePomodoroSettings, defaultPomodoroSettings } from '@/hooks/use-pomodoro-settings';
import { playSound, vibrationSupported, primeAudio } from '@/lib/timer-sounds';
import type { SoundPreset } from '@/lib/timer-sounds';
import { useTheme } from '@/components/theme/ThemeProvider';

interface Props {
  trigger?: React.ReactNode;
  onResetCycle?: () => void;
  onApplyConfig?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const SOUND_OPTIONS: { value: SoundPreset; label: string }[] = [
  { value: 'bell', label: 'Bell' },
  { value: 'chime', label: 'Chime' },
  { value: 'digital', label: 'Digital' },
  { value: 'off', label: 'Off' },
];

export const PomodoroSettingsSheet: React.FC<Props> = ({ trigger, onResetCycle, onApplyConfig, open, onOpenChange }) => {
  const { theme } = useTheme();
  const { settings, update } = usePomodoroSettings();
  const vibeOk = vibrationSupported();
  const [viewport, setViewport] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const isLiquidGlass = theme === 'liquid-glass';

  const testSound = () => {
    primeAudio();
    playSound(settings.sound, settings.volume);
  };

  const isControlled = open !== undefined;

  const updateViewport = useCallback(() => {
    const visualViewport = window.visualViewport;
    setViewport({
      x: window.scrollX + (visualViewport?.offsetLeft ?? 0),
      y: window.scrollY + (visualViewport?.offsetTop ?? 0),
      width: visualViewport?.width ?? window.innerWidth,
      height: visualViewport?.height ?? window.innerHeight,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isLiquidGlass || !open) return;
    updateViewport();
    const visualViewport = window.visualViewport;
    window.addEventListener('scroll', updateViewport, { passive: true });
    window.addEventListener('resize', updateViewport);
    visualViewport?.addEventListener('scroll', updateViewport);
    visualViewport?.addEventListener('resize', updateViewport);
    return () => {
      window.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
      visualViewport?.removeEventListener('scroll', updateViewport);
      visualViewport?.removeEventListener('resize', updateViewport);
    };
  }, [isLiquidGlass, open, updateViewport]);

  const liquidSheetStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (!isLiquidGlass || !open) return undefined;
    return {
      position: 'absolute',
      left: viewport.x,
      right: 'auto',
      top: viewport.y + Math.max(0, viewport.height * 0.15),
      bottom: 'auto',
      width: viewport.width,
      maxHeight: viewport.height * 0.85,
      transform: 'none',
      zIndex: 2147483001,
    };
  }, [isLiquidGlass, open, viewport]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {!isControlled && trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}

      <SheetContent side="bottom" style={liquidSheetStyle} className="pomodoro-settings-sheet max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Pomodoro Settings
          </SheetTitle>
          <SheetDescription>
            Customize durations, sounds and alerts. Saved automatically.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 pb-6">
          {/* Durations */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Durations</h3>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Focus</Label>
                <span className="text-muted-foreground">{settings.focus} min</span>
              </div>
              <Slider
                value={[settings.focus]}
                min={5}
                max={90}
                step={5}
                onValueChange={([v]) => update({ focus: v })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Short break</Label>
                <span className="text-muted-foreground">{settings.short} min</span>
              </div>
              <Slider
                value={[settings.short]}
                min={1}
                max={30}
                step={1}
                onValueChange={([v]) => update({ short: v })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Long break</Label>
                <span className="text-muted-foreground">{settings.long} min</span>
              </div>
              <Slider
                value={[settings.long]}
                min={5}
                max={45}
                step={5}
                onValueChange={([v]) => update({ long: v })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Long break every</Label>
                <span className="text-muted-foreground">{settings.longEvery} pomodoros</span>
              </div>
              <Slider
                value={[settings.longEvery]}
                min={2}
                max={8}
                step={1}
                onValueChange={([v]) => update({ longEvery: v })}
              />
            </div>
          </section>

          {/* Sound */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Alert sound</h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={testSound}
                disabled={settings.sound === 'off'}
              >
                <Play className="h-3.5 w-3.5 mr-1" />
                Test
              </Button>
            </div>
            <RadioGroup
              value={settings.sound}
              onValueChange={(v) => update({ sound: v as SoundPreset })}
              className="grid grid-cols-2 gap-2"
            >
              {SOUND_OPTIONS.map(opt => (
                <Label
                  key={opt.value}
                  htmlFor={`sound-${opt.value}`}
                  className="flex items-center gap-2 rounded-md border border-border p-2 cursor-pointer hover:bg-muted/50"
                >
                  <RadioGroupItem value={opt.value} id={`sound-${opt.value}`} />
                  <span>{opt.label}</span>
                </Label>
              ))}
            </RadioGroup>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <Label className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Volume
                </Label>
                <span className="text-muted-foreground">{Math.round(settings.volume * 100)}%</span>
              </div>
              <Slider
                value={[Math.round(settings.volume * 100)]}
                min={0}
                max={100}
                step={5}
                disabled={settings.sound === 'off'}
                onValueChange={([v]) => update({ volume: v / 100 })}
              />
            </div>
          </section>

          {/* Vibration */}
          {vibeOk && (
            <section className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold">Vibration</Label>
                <p className="text-xs text-muted-foreground">Buzz your phone when timer ends</p>
              </div>
              <Switch
                checked={settings.vibrate}
                onCheckedChange={(v) => update({ vibrate: v })}
              />
            </section>
          )}

          {/* Actions */}
          <section className="flex flex-col gap-2 pt-2 border-t border-border">
            {onApplyConfig && (
              <Button
                onClick={() => {
                  onApplyConfig();
                  onOpenChange?.(false);
                }}
              >
                Set this configuration
              </Button>
            )}
            {onResetCycle && (
              <Button variant="outline" onClick={onResetCycle}>
                Reset pomodoro cycle
              </Button>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
};
