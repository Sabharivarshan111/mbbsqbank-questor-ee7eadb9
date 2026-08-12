import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '@/theme';
import { GradientFill } from './Gradient';

let seq = 0;

/**
 * The "YOUR YEAR" ring on My Progress: a track, an arc for the completed
 * fraction, and a dot marking the head of the arc.
 */
export function ProgressRing({
  percent,
  size = 190,
  thickness = 10,
  children,
}: {
  percent: number;
  size?: number;
  thickness?: number;
  children?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const id = useMemo(() => {
    seq += 1;
    return `ring${seq}`;
  }, []);

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const dash = (clamped / 100) * circumference;

  // Head of the arc, starting at 12 o'clock and sweeping clockwise.
  const angle = (clamped / 100) * 2 * Math.PI - Math.PI / 2;
  const dotX = size / 2 + radius * Math.cos(angle);
  const dotY = size / 2 + radius * Math.sin(angle);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.fuchsia} />
            <Stop offset="1" stopColor="#FB923C" />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.cardElevated}
          strokeWidth={thickness}
          fill="none"
        />
        {clamped > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`url(#${id})`}
            strokeWidth={thickness}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${dash} ${circumference}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
        <Circle cx={dotX} cy={dotY} r={thickness * 0.62} fill={colors.fuchsia} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
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
  barTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFillWrap: {
    height: 3,
  },
});
