// Web Audio API - tiny synthesizer for pomodoro alerts.
// No assets, no deps. Lazily creates AudioContext on first call
// to satisfy browser autoplay policies (must follow a user gesture).

export type SoundPreset = 'bell' | 'chime' | 'digital' | 'off';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  // Resume in case it was suspended (mobile)
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

function tone(
  frequency: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
  startOffset = 0,
) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = frequency;

  const start = c.currentTime + startOffset;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0002), start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function playBell(volume: number) {
  // Two-tone bell: fundamental + harmonic
  tone(880, 1.4, volume, 'sine', 0);
  tone(1320, 1.2, volume * 0.5, 'sine', 0);
}

function playChime(volume: number) {
  // C-E-G arpeggio
  tone(523.25, 0.6, volume, 'sine', 0);
  tone(659.25, 0.6, volume, 'sine', 0.15);
  tone(783.99, 0.9, volume, 'sine', 0.3);
}

function playDigital(volume: number) {
  // Two quick square-wave beeps
  tone(1000, 0.12, volume * 0.6, 'square', 0);
  tone(1000, 0.12, volume * 0.6, 'square', 0.18);
  tone(1400, 0.18, volume * 0.6, 'square', 0.36);
}

export function playSound(preset: SoundPreset, volume = 0.6) {
  if (preset === 'off') return;
  const v = Math.min(1, Math.max(0, volume));
  switch (preset) {
    case 'bell':
      return playBell(v);
    case 'chime':
      return playChime(v);
    case 'digital':
      return playDigital(v);
  }
}

// Call once on first user gesture to "unlock" audio on mobile.
export function primeAudio() {
  getCtx();
}

export function vibrate(pattern: number | number[] = [200, 100, 200]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }
}

export function vibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}
