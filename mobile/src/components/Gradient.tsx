import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

let gradientSeq = 0;

/**
 * Diagonal gradient fill, the native stand-in for Tailwind's
 * `bg-gradient-to-br from-… to-…`. Drawn with react-native-svg so it needs no
 * extra native module.
 */
export function GradientFill({
  from,
  to,
  style,
  borderRadius = 0,
}: {
  from: string;
  to: string;
  style?: ViewStyle;
  borderRadius?: number;
}) {
  const id = React.useMemo(() => {
    gradientSeq += 1;
    return `grad${gradientSeq}`;
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { borderRadius, overflow: 'hidden' }, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
