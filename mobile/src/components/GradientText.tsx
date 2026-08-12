import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/theme';

let seq = 0;

// SVG text defaults to a serif face; name the UI font so headings match the
// rest of the app.
const FONT_FAMILY = Platform.select({
  android: 'sans-serif',
  default: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
});

/**
 * Single-line heading with a horizontal colour gradient, matching the
 * `bg-gradient-to-r … bg-clip-text text-transparent` headings on the web.
 * Drawn as SVG text because React Native cannot gradient-fill glyphs.
 */
export function GradientText({
  children,
  size = 24,
  weight = '800',
  letterSpacing = 0,
  from,
  to,
  align = 'center',
}: {
  children: string;
  size?: number;
  weight?: string;
  letterSpacing?: number;
  from?: string;
  to?: string;
  align?: 'center' | 'left';
}) {
  const { colors } = useTheme();
  const id = useMemo(() => {
    seq += 1;
    return `gt${seq}`;
  }, []);

  const start = from ?? colors.text;
  const end = to ?? colors.fuchsia;
  const height = Math.round(size * 1.35);

  return (
    <View style={[styles.wrap, { height }]}>
      <Svg width="100%" height={height}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={start} />
            <Stop offset="0.55" stopColor={start} />
            <Stop offset="1" stopColor={end} />
          </LinearGradient>
        </Defs>
        <SvgText
          x={align === 'center' ? '50%' : '0'}
          y={size}
          fontSize={size}
          fontFamily={FONT_FAMILY}
          fontWeight={weight}
          letterSpacing={letterSpacing}
          textAnchor={align === 'center' ? 'middle' : 'start'}
          fill={`url(#${id})`}>
          {children}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
});
