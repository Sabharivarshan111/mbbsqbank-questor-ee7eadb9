import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Text } from '@/components/Text';
import { Touchable } from '@/components/Touchable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { FileText, Home, Sparkles, Timer, User } from 'lucide-react-native';
import { useTheme, withAlpha } from '@/theme';
import { lit } from '@/theme/color';
import { DURATION, EASE, SPRING, springConfig, springTo, useReducedMotion } from '@/theme/motion';
import type { RootTabParamList } from '@/navigation/types';

type TabKey = keyof RootTabParamList;

const ITEMS: { key: TabKey; label: string; Icon: typeof Home }[] = [
  { key: 'Home', label: 'Home', Icon: Home },
  { key: 'Notes', label: 'Notes', Icon: FileText },
  { key: 'Timer', label: 'Timer', Icon: Timer },
  { key: 'AskAI', label: 'Ask AI', Icon: Sparkles },
  { key: 'Progress', label: 'My Progress', Icon: User },
];

/**
 * Geometry. Horizontally the blob is positioned from the same numbers the
 * stylesheet uses rather than from measurement: every tab is `flex: 1`, so a
 * slot is the bar's content width divided by five. Measuring five children
 * instead would cost five layout callbacks per rotation to learn what
 * arithmetic already knows, and could silently disagree with the styles.
 *
 * Height is the exception, and is measured — see PILL_GUTTER below.
 */
const BAR_PAD_X = 8;
const BAR_PAD_TOP = 6;
const ITEM_PAD_Y = 6;
const ICON_SIZE = 20;
const ICON_LABEL_GAP = 3;

/**
 * The pill wraps the whole tab — icon *and* label — so the label is written on
 * the accent rather than sitting under a badge. It is sized from the slot and
 * from the measured height of a tab's content, not from constants, because the
 * label's height moves with the in-app text size: a fixed height would leave
 * "My Progress" hanging out of the bottom at the largest setting.
 */
const PILL_GUTTER = 6;
const PILL_INSET_Y = 2;
const PILL_RADIUS = 20;
/**
 * The glow is drawn *inside* the SVG rather than as a shadow, because on
 * Android `elevation` is what draws a shadow and any elevated view jumps in
 * front of its non-elevated siblings — the blob would cover the icons it is
 * meant to sit behind. A radial wash costs one gradient and paints in order.
 */
const GLOW_PAD = 10;

/**
 * Port of src/components/shell/BottomNav.tsx: five items with the Timer raised
 * into a floating disc in the middle.
 *
 * Selection is carried by a **gradient blob that springs from the old tab to
 * the new one**, wrapping the icon and its label together. It replaced a dot
 * that faded in under each label: a dot tells you where you are, a thing that
 * travels tells you where you *came from*, which is the part that makes a tab
 * bar feel like one surface rather than five independent buttons.
 *
 * Three details that are load-bearing:
 *
 *   • It moves on `translateX` with `SPRING.momentum`, so it overshoots
 *     slightly and settles — the spring is the whole effect, and it runs on
 *     the native driver so a question-bank walk cannot stutter it.
 *   • The icon and label are drawn **twice**, muted underneath and active on
 *     top, and the top copy is cross-faded by opacity. Colour cannot be
 *     animated on the native driver, and switching it instantly would repaint
 *     the outgoing icon in a muted colour while the blob is still underneath
 *     it — briefly unreadable. Two layers and an opacity keeps every frame on
 *     the GPU and legible.
 *   • The Timer keeps its raised disc and takes no pill: the disc is already
 *     the accent-free landmark in the middle of the bar, and a pill behind a
 *     button that floats above the bar reads as two separate things. The blob
 *     fades as it arrives at that slot and the disc's own scale takes over. It
 *     still travels there, so leaving the Timer starts the blob from where the
 *     eye last saw it.
 *
 * Two design-skill notes that predate the blob and still hold:
 *   • The bar is the app's persistent chrome, so it carries a bright hairline
 *     top edge — the cue that reads as "a layer floating above the content"
 *     (SKILL §12). Real backdrop blur would need a native module; see
 *     .claude/skills/apple-design/README.md for why that was not taken.
 *   • The labels are the contents' names — "Progress", "Notes", "Timer" —
 *     not generic umbrellas, which is what makes the destinations predictable
 *     (SKILL §16).
 */
export default function BottomNav({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const activeKey = state.routes[state.index]?.name as TabKey | undefined;
  const activeIndex = Math.max(
    0,
    ITEMS.findIndex(item => item.key === activeKey),
  );
  const onTimer = activeKey === 'Timer';

  const [barWidth, setBarWidth] = useState(0);
  const [faceHeight, setFaceHeight] = useState(0);
  const slot = barWidth > 0 ? (barWidth - BAR_PAD_X * 2) / ITEMS.length : 0;
  const pillW = slot - PILL_GUTTER;
  const pillH = faceHeight - PILL_INSET_Y * 2;
  const canvasW = pillW + GLOW_PAD * 2;
  const canvasH = pillH + GLOW_PAD * 2;
  const ready = slot > 0 && faceHeight > 0;
  const blobLeft = (index: number) => BAR_PAD_X + index * slot + (slot - canvasW) / 2;

  const blobX = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);
  const blobIn = useRef(new Animated.Value(onTimer ? 0 : 1)).current;
  const discScale = useRef(new Animated.Value(onTimer ? 1 : 0)).current;
  // One value per tab, driving the active layer's opacity and its lift.
  const faces = useRef(
    ITEMS.map(item => new Animated.Value(item.key === activeKey ? 1 : 0)),
  ).current;

  // First placement is not an animation: nothing may animate on first paint,
  // and there is no previous tab to have travelled from.
  useEffect(() => {
    if (!ready) {
      return;
    }
    const target = blobLeft(activeIndex);
    if (!placed.current) {
      placed.current = true;
      blobX.setValue(target);
      return;
    }
    springTo(blobX, target, { spring: SPRING.momentum, reduceMotion }).start();
    // blobLeft is derived from slot, which is in the deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, slot, ready, blobX, reduceMotion]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(blobIn, {
        toValue: onTimer ? 0 : 1,
        duration: DURATION.fast,
        easing: EASE.out,
        useNativeDriver: true,
      }),
      ...faces.map((value, index) =>
        Animated.timing(value, {
          toValue: ITEMS[index].key === activeKey ? 1 : 0,
          duration: DURATION.fast,
          easing: EASE.out,
          useNativeDriver: true,
        }),
      ),
    ]).start();
  }, [activeKey, onTimer, blobIn, faces]);

  useEffect(() => {
    if (reduceMotion) {
      discScale.setValue(onTimer ? 1 : 0);
      return;
    }
    Animated.spring(discScale, {
      toValue: onTimer ? 1 : 0,
      ...springConfig(SPRING.momentum),
    }).start();
  }, [onTimer, discScale, reduceMotion]);

  /**
   * The gradient's far stop moves the accent *away* from the icon colour, so a
   * lit blob can only ever raise the icon's contrast against it, never lower
   * it. That is what lets a gradient exist at all under a four-colour theme
   * the user picked — see `lit` in theme/color.ts; check:contrast proves it.
   */
  const litAccent = useMemo(() => lit(colors.accent, colors.onAccent), [colors]);

  return (
    <View
      onLayout={(event: LayoutChangeEvent) => setBarWidth(event.nativeEvent.layout.width)}
      style={[
        styles.bar,
        {
          backgroundColor: colors.background,
          borderTopColor: withAlpha(colors.text, 0.14),
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
        },
      ]}>
      {ready ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.blob,
            {
              top: BAR_PAD_TOP + PILL_INSET_Y - GLOW_PAD,
              width: canvasW,
              height: canvasH,
              opacity: blobIn,
              transform: [
                { translateX: blobX },
                // The blob lifts with the tab it is under. Without this the
                // label rises 2dp into a pill that stayed put, and the two
                // overlap.
                {
                  translateY: blobIn.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, reduceMotion ? 0 : -2],
                  }),
                },
                // From 0.9, not 0 — nothing in this app scales out of nothing.
                {
                  scale: blobIn.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }),
                },
              ],
            },
          ]}>
          <Svg width={canvasW} height={canvasH}>
            <Defs>
              <RadialGradient id="navGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0" stopColor={colors.accent} stopOpacity="0.34" />
                <Stop offset="0.55" stopColor={colors.accent} stopOpacity="0.16" />
                <Stop offset="1" stopColor={colors.accent} stopOpacity="0" />
              </RadialGradient>
              <LinearGradient id="navBlob" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={litAccent} />
                <Stop offset="1" stopColor={colors.accent} />
              </LinearGradient>
            </Defs>
            <Ellipse
              cx={canvasW / 2}
              cy={canvasH / 2}
              rx={canvasW / 2}
              ry={canvasH / 2}
              fill="url(#navGlow)"
            />
            <Rect
              x={GLOW_PAD}
              y={GLOW_PAD}
              width={pillW}
              height={pillH}
              rx={PILL_RADIUS}
              fill="url(#navBlob)"
            />
          </Svg>
        </Animated.View>
      ) : null}

      {ITEMS.map(({ key, label, Icon }, index) => {
        const isActive = activeKey === key;
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: state.routes.find(route => route.name === key)?.key ?? '',
            canPreventDefault: true,
          });
          if (!isActive && !event.defaultPrevented) {
            navigation.navigate(key);
          }
        };

        if (key === 'Timer') {
          return (
            <Touchable
              key={key}
              onPress={onPress}
              role="tab"
              label="Timer"
              state={{ selected: isActive }}
              scaleTo={0.92}
              style={styles.centerItem}>
              <Animated.View
                style={[
                  styles.centerDisc,
                  {
                    backgroundColor: colors.primary,
                    borderColor: colors.background,
                    transform: [
                      {
                        scale: discScale.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.06],
                        }),
                      },
                    ],
                  },
                ]}>
                <Icon size={24} color={colors.primaryText} />
              </Animated.View>
            </Touchable>
          );
        }

        const face = faces[index];
        return (
          <Touchable
            key={key}
            onPress={onPress}
            role="tab"
            label={label}
            state={{ selected: isActive }}
            scaleTo={0.9}
            style={styles.item}>
            <Animated.View
              // One tab is enough: they are all the same content in the same
              // box. The height is what the in-app text size moves, so the
              // pill is sized from it rather than from a constant.
              onLayout={
                index === 0
                  ? event => setFaceHeight(event.nativeEvent.layout.height)
                  : undefined
              }
              style={[
                styles.face,
                {
                  transform: [
                    {
                      // The active tab lifts 2dp, the way a key rises under a
                      // finger. Dropped entirely under reduced motion.
                      translateY: face.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, reduceMotion ? 0 : -2],
                      }),
                    },
                  ],
                },
              ]}>
              <Icon size={ICON_SIZE} color={colors.textMuted} />
              <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
              {/* The active copy. Cross-faded, never recoloured — see the
                  component comment. Hidden from TalkBack so the label is not
                  announced twice. */}
              <Animated.View
                pointerEvents="none"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={[StyleSheet.absoluteFill, styles.face, { opacity: face }]}>
                <Icon size={ICON_SIZE} color={colors.onAccent} />
                <Text style={[styles.label, { color: colors.onAccent }]}>{label}</Text>
              </Animated.View>
            </Animated.View>
          </Touchable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: BAR_PAD_TOP,
    paddingHorizontal: BAR_PAD_X,
  },
  blob: {
    position: 'absolute',
    left: 0,
    // `top`, `width` and `height` are set inline: all three are measured, so
    // they cannot live in a static stylesheet. The canvas is larger than the
    // pill by the glow's padding on every side, and the overhang above the bar
    // is the glow bleeding onto the content — which is what a glow does.
  },
  item: {
    flex: 1,
    // Keeps every tab at the 44dp touch minimum even at the smallest font
    // scale.
    minHeight: 48,
  },
  face: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: ICON_LABEL_GAP,
    paddingVertical: ITEM_PAD_Y,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
  },
  centerItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
  },
  centerDisc: {
    height: 56,
    width: 56,
    borderRadius: 28,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    // Matches the web shadow-lg on the raised button.
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
