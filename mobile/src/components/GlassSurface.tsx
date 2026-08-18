import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme, withAlpha } from '@/theme';
import { radius } from '@/theme/tokens';

/**
 * A card surface that knows whether the theme is solid or glass.
 *
 * Under `solid` it is what it always was: an opaque card with a hairline
 * border. Under `glass` it becomes Apple's Liquid Glass treatment, as far as
 * React Native can honestly take it.
 *
 * Three things do the work, in order of how much they matter:
 *
 * **1. The specular highlight.** A bright hairline along the top edge fading
 * to nothing by the bottom, as if a light sits above the screen. This is the
 * most identifiable feature of the material and the cheapest to draw
 * correctly — one gradient, no native module. Take it away and the rest reads
 * as a pale card.
 *
 * **2. Translucency.** The fill is a white wash at partial alpha rather than
 * an opaque colour, so the page shows through and two stacked surfaces differ
 * in depth rather than only in lightness.
 *
 * **3. Float.** A soft shadow and a larger radius, so a panel sits above the
 * page instead of being cut into it.
 *
 * What is deliberately missing is the backdrop blur and the edge lensing.
 * Both need a real backdrop filter; React Native has none without a native
 * module, and a lighter rectangle pretending to be a blur is exactly what
 * makes an imitation look cheap. If `react-native-blur` is ever added, this is
 * the one component that needs to change.
 *
 * The rim is drawn with react-native-svg — already a dependency — and is
 * `pointerEvents="none"`, so it never intercepts a tap meant for the content.
 */
export function GlassSurface({
  children,
  style,
  /** Raised surfaces sit brighter, the way a nearer pane catches more light. */
  elevated = false,
  borderRadius = radius.lg,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  borderRadius?: number;
}) {
  const { colors } = useTheme();
  const glass = colors.material === 'glass';

  if (!glass) {
    return (
      <View
        style={[
          {
            backgroundColor: elevated ? colors.cardElevated : colors.card,
            borderColor: colors.border,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius,
          },
          style,
        ]}>
        {children}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.glass,
        {
          // The wash, not the colour. Alpha is what lets the page read through.
          backgroundColor: withAlpha(colors.card, elevated ? 0.78 : 0.62),
          // The border is the *unlit* part of the rim; the gradient below adds
          // the lit part. A single flat border would flatten it back out.
          borderColor: withAlpha('#FFFFFF', 0.55),
          borderRadius,
        },
        style,
      ]}>
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { borderRadius, overflow: 'hidden' }]}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="specular" x1="0" y1="0" x2="0" y2="1">
              {/* Bright at the lit edge, gone by a third of the way down —
                  light falls off fast on a curved surface. */}
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.85" />
              <Stop offset="0.35" stopColor="#FFFFFF" stopOpacity="0.12" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#specular)" />
        </Svg>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glass: {
    borderWidth: 1,
    // Float. Glass has no weight of its own; the shadow is what says it is a
    // pane above the page rather than a panel set into it.
    elevation: 6,
    shadowColor: '#0B1B33',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
});
