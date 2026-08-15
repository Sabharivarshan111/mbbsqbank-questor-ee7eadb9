import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '@/theme';
import { SPRING, springConfig, useReducedMotion } from '@/theme/motion';
import { GradientFill } from './Gradient';

let seq = 0;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * The "YOUR YEAR" ring on My Progress: a track, an arc for the completed
 * fraction, and a dot marking the head of the arc.
 *
 * The arc springs to its value rather than appearing at it. A number that
 * animates into place is legible as *progress*; one that is simply drawn is
 * just a shape (SKILL §16 Craft — responsive feedback that reads as natural).
 *
 * This is the one animation in the app that cannot use the native driver:
 * stroke geometry is not a transform, so react-native-svg has to be driven
 * from JS. It is a single value on a screen that is not scrolling while it
 * runs, which is the only reason that is acceptable here — everything a finger
 * touches stays on the native thread.
 */
export function ProgressRing({
  percent,
  size = 190,
  thickness = 10,
  from,
  to = '#FB923C',
  showDot = true,
  trackColor,
  animate = true,
  children,
}: {
  percent: number;
  size?: number;
  thickness?: number;
  /** Arc gradient start. Defaults to the theme's accent. */
  from?: string;
  to?: string;
  /** The head marker. Off for continuously moving values like a countdown,
   *  where a travelling dot reads as a second, competing clock hand. */
  showDot?: boolean;
  trackColor?: string;
  /**
   * Set false when the value already changes continuously on its own — a
   * per-second countdown, for instance. Re-targeting a spring every tick costs
   * JS work every second and never actually settles.
   */
  animate?: boolean;
  children?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const id = useMemo(() => {
    seq += 1;
    return `ring${seq}`;
  }, []);

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));

  const progress = useRef(new Animated.Value(clamped)).current;
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current || reduceMotion || !animate) {
      firstRun.current = false;
      progress.setValue(clamped);
      return;
    }
    Animated.spring(progress, {
      toValue: clamped,
      ...springConfig(SPRING.default),
      useNativeDriver: false,
    }).start();
  }, [animate, clamped, progress, reduceMotion]);

  // Draw the full circle and hide the unfinished part, so only one value has
  // to animate.
  const dashOffset = progress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  // The head dot rides a rotated container rather than animated cx/cy — a
  // linear interpolation between two points on a circle would cut across the
  // chord instead of following the arc.
  const rotation = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from ?? colors.fuchsia} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor ?? colors.cardElevated}
          strokeWidth={thickness}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${id})`}
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {showDot ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.dotOrbit,
            { transform: [{ rotate: rotation }] },
          ]}>
          <View
            style={{
              width: thickness * 1.24,
              height: thickness * 1.24,
              borderRadius: thickness * 0.62,
              backgroundColor: from ?? colors.fuchsia,
              marginTop: (thickness - thickness * 1.24) / 2,
            }}
          />
        </Animated.View>
      ) : null}

      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
}

/** Thin white-to-pink bar shown under topic names in the browse lists. */
export function ThinBar({ percent }: { percent: number }) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <View style={[styles.barTrack, { backgroundColor: colors.cardElevated }]}>
      {clamped > 0 ? (
        <View style={[styles.barFillWrap, { width: `${clamped}%` }]}>
          <GradientFill from={colors.text} to={colors.fuchsia} borderRadius={2} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOrbit: {
    alignItems: 'center',
  },
  barTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFillWrap: {
    height: 3,
  },
});
