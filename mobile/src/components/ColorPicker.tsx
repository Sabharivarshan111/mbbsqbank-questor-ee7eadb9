import React, { useCallback, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Text } from '@/components/Text';
import { useTheme } from '@/theme';
import { hexToHsv, hsvToHex, isHex, normalizeHex, onColor } from '@/theme/color';
import { radius, space } from '@/theme/tokens';

/**
 * Saturation/value square with a hue slider — the shape of every colour picker
 * people already know, and the one in the web app.
 *
 * Drawn with react-native-svg because React Native has no gradients of its own
 * and this needs four: a hue wash and a black overlay for the square, and the
 * spectrum for the slider. The alternative was a native picker module, which
 * would mean a new dependency and a shim in the preview harness for one screen.
 *
 * Dragging is handled with PanResponder rather than by tapping, because a
 * colour is chosen by *comparison* — you slide until it looks right against
 * what is behind it. Tap-only would make every adjustment a guess.
 */

const SQUARE = 190;
const SLIDER = 26;
const KNOB = 22;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function ColorPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (hex: string) => void;
  label: string;
}) {
  const { colors } = useTheme();
  const hsv = useMemo(() => hexToHsv(value), [value]);

  // The typed field is separate state so a half-finished hex ("#2D1") does not
  // fight the picker or get normalised out from under the caret.
  const [draft, setDraft] = useState<string | null>(null);

  /**
   * Held in refs, not state.
   *
   * A PanResponder is created once and captures whatever `hsv` was in scope at
   * the time. Reading through refs means a drag always continues from where
   * the colour actually is, rather than from where it was when the responder
   * was built — the difference between dragging smoothly and the knob jumping
   * back to its starting point on the second gesture.
   */
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const squareResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: event => {
          const { locationX, locationY } = event.nativeEvent;
          onChangeRef.current(
            hsvToHex({
              h: hsvRef.current.h,
              s: clamp01(locationX / SQUARE),
              v: 1 - clamp01(locationY / SQUARE),
            }),
          );
        },
        onPanResponderMove: event => {
          const { locationX, locationY } = event.nativeEvent;
          onChangeRef.current(
            hsvToHex({
              h: hsvRef.current.h,
              s: clamp01(locationX / SQUARE),
              v: 1 - clamp01(locationY / SQUARE),
            }),
          );
        },
      }),
    [],
  );

  const hueResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: event => {
          const { locationX } = event.nativeEvent;
          onChangeRef.current(
            hsvToHex({ ...hsvRef.current, h: clamp01(locationX / SQUARE) * 360 }),
          );
        },
        onPanResponderMove: event => {
          const { locationX } = event.nativeEvent;
          onChangeRef.current(
            hsvToHex({ ...hsvRef.current, h: clamp01(locationX / SQUARE) * 360 }),
          );
        },
      }),
    [],
  );

  const commitDraft = useCallback(
    (text: string) => {
      if (isHex(text)) {
        onChange(normalizeHex(text));
      }
      setDraft(null);
    },
    [onChange],
  );

  const pureHue = hsvToHex({ h: hsv.h, s: 1, v: 1 });

  return (
    <View style={styles.wrap} accessibilityLabel={`${label} colour picker`}>
      {/* Saturation across, brightness down. */}
      <View
        style={[styles.square, { borderColor: colors.border }]}
        {...squareResponder.panHandlers}>
        <Svg width={SQUARE} height={SQUARE}>
          <Defs>
            <LinearGradient id="sat" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#FFFFFF" />
              <Stop offset="1" stopColor={pureHue} />
            </LinearGradient>
            <LinearGradient id="val" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000000" stopOpacity="0" />
              <Stop offset="1" stopColor="#000000" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={SQUARE} height={SQUARE} fill="url(#sat)" />
          <Rect x="0" y="0" width={SQUARE} height={SQUARE} fill="url(#val)" />
        </Svg>
        <View
          pointerEvents="none"
          style={[
            styles.knob,
            {
              // The ring is drawn in whichever of black or white reads on the
              // colour under it, so it never disappears into its own swatch.
              borderColor: onColor(value),
              left: hsv.s * SQUARE - KNOB / 2,
              top: (1 - hsv.v) * SQUARE - KNOB / 2,
            },
          ]}
        />
      </View>

      <View style={[styles.slider, { borderColor: colors.border }]} {...hueResponder.panHandlers}>
        <Svg width={SQUARE} height={SLIDER}>
          <Defs>
            <LinearGradient id="hue" x1="0" y1="0" x2="1" y2="0">
              {['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000'].map(
                (stop, i) => (
                  <Stop key={stop + i} offset={`${i / 6}`} stopColor={stop} />
                ),
              )}
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={SQUARE} height={SLIDER} fill="url(#hue)" />
        </Svg>
        <View
          pointerEvents="none"
          style={[
            styles.knob,
            {
              borderColor: '#FFFFFF',
              left: (hsv.h / 360) * SQUARE - KNOB / 2,
              top: (SLIDER - KNOB) / 2,
            },
          ]}
        />
      </View>

      <View style={styles.hexRow}>
        <View style={[styles.chip, { backgroundColor: value, borderColor: colors.border }]} />
        {/* Typing a hex is how a brand colour gets in. A picker alone cannot
            hit an exact value, and #RRGGBB is what a design hands you. */}
        <TextInput
          value={draft ?? value}
          onChangeText={setDraft}
          onBlur={() => commitDraft(draft ?? value)}
          onSubmitEditing={() => commitDraft(draft ?? value)}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={7}
          accessibilityLabel={`${label} hex value`}
          style={[styles.hexInput, { color: colors.text, borderColor: colors.border }]}
        />
        <Text style={[styles.hexHint, { color: colors.textMuted }]}>hex</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.sm,
    alignItems: 'center',
  },
  square: {
    width: SQUARE,
    height: SQUARE,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  slider: {
    width: SQUARE,
    height: SLIDER,
    borderRadius: SLIDER / 2,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  knob: {
    position: 'absolute',
    height: KNOB,
    width: KNOB,
    borderRadius: KNOB / 2,
    borderWidth: 3,
  },
  hexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    width: SQUARE,
  },
  chip: {
    height: 32,
    width: 32,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  hexInput: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  hexHint: {
    fontSize: 12,
  },
});
