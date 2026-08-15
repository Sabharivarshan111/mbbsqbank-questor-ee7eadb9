import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';

/**
 * Motion system.
 *
 * Ported from .claude/skills/apple-design/SKILL.md — see the README next to it
 * for why each web technique became what it is here. The short version:
 *
 *   • Springs, not durations, for anything a finger can touch. A spring
 *     animates from the Animated.Value's *current* value, so grabbing a moving
 *     element mid-flight continues from where it visibly is instead of jumping
 *     (SKILL §3, "always animate from the presentation value").
 *   • Everything runs on the native driver, so a busy JS thread — question-bank
 *     walks, Supabase round-trips — cannot drop animation frames. This matters
 *     more on the low-end phones most of our users have than on a flagship.
 */

/**
 * Duration scale for the few places a spring genuinely does not apply —
 * opacity cross-fades, scrim dimming. Kept short; SKILL §1 treats every
 * avoidable millisecond on the input path as a regression.
 */
export const DURATION = {
  /** Press feedback and other tens-of-times-a-day motion. */
  instant: 100,
  fast: 160,
  base: 220,
  /**
   * The ceiling. UI motion stays under 300ms — a 180ms dropdown reads as more
   * responsive than a 400ms one (review-animations/STANDARDS.md). Only sheets
   * and drawers may approach this, and nothing may exceed it.
   */
  slow: 280,
} as const;

/**
 * Apple's two designer-facing parameters (SKILL §4), rather than the physics
 * triplet:
 *
 *   dampingRatio — overshoot. 1.0 = critically damped, no bounce.
 *                  < 1.0 overshoots; lower is bouncier.
 *   response     — how quickly the value reaches the target, in seconds.
 *                  NOT a duration; a spring has no fixed duration.
 */
export interface AppleSpring {
  dampingRatio: number;
  response: number;
}

/**
 * Convert to the mass/stiffness/damping triplet Animated.spring wants.
 *
 * With mass = 1 and natural frequency ω = 2π / response:
 *   stiffness = ω²
 *   damping   = 2ζω
 */
export function springConfig(spring: AppleSpring) {
  const omega = (2 * Math.PI) / spring.response;
  return {
    mass: 1,
    stiffness: omega * omega,
    damping: 2 * spring.dampingRatio * omega,
    useNativeDriver: true,
    // Settle a touch early. Sub-pixel motion is invisible but still costs a
    // frame callback per tick on a slow device.
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  };
}

/**
 * Easing curves for the few things a spring does not cover.
 *
 * React Native's default timing easing is `Easing.inOut(Easing.ease)` — an
 * ease-in-out, which starts slow. On something entering or leaving, that
 * delays the exact moment the user is looking (animate/STANDARDS.md: "never
 * ease-in on UI"). The built-in `Easing.out(Easing.ease)` is the other
 * problem the standards call out: too weak to read as deliberate.
 *
 * So every timing in the app names one of these explicitly.
 */
export const EASE = {
  /** cubic-bezier(0.23, 1, 0.32, 1) — the house ease-out. Entrances, exits. */
  out: Easing.bezier(0.23, 1, 0.32, 1),
  /** cubic-bezier(0.77, 0, 0.175, 1) — for things moving *within* the screen. */
  inOut: Easing.bezier(0.77, 0, 0.175, 1),
  /** cubic-bezier(0.32, 0.72, 0, 1) — the iOS drawer curve. */
  drawer: Easing.bezier(0.32, 0.72, 0, 1),
  linear: Easing.linear,
} as const;

/**
 * House springs. Damping is 1.0 by default and only drops to 0.8 where the
 * gesture itself carried momentum — overshoot on something you flicked feels
 * right, overshoot on a menu that merely appeared feels wrong (SKILL §4).
 */
export const SPRING = {
  /** Default for anything that just moves or resizes. */
  default: { dampingRatio: 1.0, response: 0.35 } as AppleSpring,
  /**
   * Press feedback. 0.16s to sit inside the 100–160ms button-feedback budget
   * in review-animations/STANDARDS.md — press feedback is seen tens of times a
   * day, and at that frequency it has to be near-imperceptible or nothing.
   */
  snappy: { dampingRatio: 1.0, response: 0.16 } as AppleSpring,
  /** Settling after a flick or drag release. */
  momentum: { dampingRatio: 0.8, response: 0.35 } as AppleSpring,
  /** Sheets and drawers — Apple's shipped value. */
  sheet: { dampingRatio: 0.8, response: 0.3 } as AppleSpring,
  /** Dismissal: critically damped, so nothing bounces on its way out. */
  dismiss: { dampingRatio: 1.0, response: 0.28 } as AppleSpring,
} as const;

/**
 * Where a flick would come to rest, from its release velocity (SKILL §6).
 * This is Apple's exponential-decay form from the Designing Fluid Interfaces
 * sample code, not the physics-textbook v²/(2a) — they do not agree, and this
 * is the one that matches scroll deceleration.
 *
 * Snap to the target nearest the *projection*, not nearest the release point;
 * that is what makes a flick feel thrown rather than nudged.
 */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Progressive resistance past a boundary (SKILL §9). A hard stop reads as
 * frozen; resistance reads as "responsive, but there is nothing more here".
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  if (dimension <= 0) {
    return 0;
  }
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/**
 * Hand the gesture's release velocity to the spring so there is no seam
 * between dragging and animating (SKILL §5). Animated.spring takes absolute
 * velocity in units/second, which is what PanResponder's `vx`/`vy` give us
 * once scaled — they are reported in points per *millisecond*.
 */
export function panVelocityToSpring(panVelocity: number): number {
  return panVelocity * 1000;
}

interface SpringToOptions {
  spring?: AppleSpring;
  /** Release velocity in units/second, from panVelocityToSpring(). */
  velocity?: number;
  /** When true, cross-fade timing is used instead (see useReducedMotion). */
  reduceMotion?: boolean;
}

/**
 * Animate a value to a target the house way.
 *
 * Under reduced motion this becomes a short linear-ish move rather than a
 * spring: reduced motion means a gentler equivalent, not the absence of
 * feedback (SKILL §14). Overshoot is always dropped in that mode.
 */
export function springTo(
  value: Animated.Value,
  toValue: number,
  { spring = SPRING.default, velocity, reduceMotion }: SpringToOptions = {},
): Animated.CompositeAnimation {
  if (reduceMotion) {
    return Animated.timing(value, {
      toValue,
      duration: DURATION.fast,
      easing: EASE.out,
      useNativeDriver: true,
    });
  }
  return Animated.spring(value, {
    toValue,
    ...springConfig(spring),
    ...(velocity === undefined ? null : { velocity }),
  });
}

/**
 * The OS "Remove animations" setting — Android's equivalent of
 * prefers-reduced-motion. Components read this and swap springs for
 * cross-fades, and scale feedback for opacity feedback.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (alive) {
          setReduced(value);
        }
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return reduced;
}

