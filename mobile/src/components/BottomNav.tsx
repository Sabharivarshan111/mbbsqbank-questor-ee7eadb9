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
 * Geometry. The blob is positioned from the same numbers the stylesheet uses
 * rather than from measurement: every tab is `flex: 1`, so a slot is just the
 * bar's content width divided by five, and the icon row starts at a known
 * offset. Measuring five children instead would cost five layout callbacks on
 * every rotation to learn what arithmetic already knows — and would silently
 * disagree with the styles if one of them changed.
 */
const BAR_PAD_X = 8;
const BAR_PAD_TOP = 6;
const ITEM_PAD_Y = 6;
const ICON_SIZE = 20;
const ICON_LABEL_GAP = 3;

/** The pill itself. */
const BLOB_W = 46;
const BLOB_H = 26;
/**
 * The glow is drawn *inside* the SVG rather than as a shadow, because on
 * Android `elevation` is what draws a shadow and any elevated view jumps in
 * front of its non-elevated siblings — the blob would cover the icons it is
 * meant to sit behind. A radial wash costs one gradient and paints in order.
 */
const GLOW_PAD_X = 12;
const GLOW_PAD_Y = 10;
const CANVAS_W = BLOB_W + GLOW_PAD_X * 2;
const CANVAS_H = BLOB_H + GLOW_PAD_Y * 2;

/**
 * Port of src/components/shell/BottomNav.tsx: five items with the Timer raised
 * into a floating disc in the middle.
 *
 * Selection is carried by a **gradient blob that springs from the old tab to
 * the new one**, behind the icon. It replaced a dot that faded in under each
 * label: a dot tells you where you are, a thing that travels tells you where
 * you *came from*, which is the part that makes a tab bar feel like one
 * surface rather than five independent buttons.
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
 *   • The Timer keeps its raised disc, so the blob fades as it arrives at that
 *     slot and the disc's own scale takes over. It still travels there, so
 *     leaving the Timer starts the blob from where the eye last saw it.
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
  const slot = barWidth > 0 ? (barWidth - BAR_PAD_X * 2) / ITEMS.length : 0;
  const blobLeft = (index: number) => BAR_PAD_X + index * slot + (slot - CANVAS_W) / 2;

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
    if (slot <= 0) {
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
  }, [activeIndex, slot, blobX, reduceMotion]);

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
      {slot > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.blob,
            {
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
          <Svg width={CANVAS_W} height={CANVAS_H}>
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
              cx={CANVAS_W / 2}
              cy={CANVAS_H / 2}
              rx={CANVAS_W / 2}
              ry={CANVAS_H / 2}
              fill="url(#navGlow)"
            />
            <Rect
              x={GLOW_PAD_X}
              y={GLOW_PAD_Y}
              width={BLOB_W}
              height={BLOB_H}
              rx={12}
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
              <View style={styles.discWrap}>
                {/* The Timer is the one tab the blob cannot sit behind — the
                    disc is raised out of the bar and covers it. So selection
                    is said the same way, in the same colour, with a ring that
                    springs out from under the disc as the blob fades in at
                    this slot. Without it the middle tab is the only one with
                    no visible selected state. */}
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.discRing,
                    {
                      borderColor: colors.accent,
                      opacity: discScale.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1],
                        extrapolate: 'clamp',
                      }),
                      transform: [
                        {
                          scale: discScale.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.9, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                />
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
              </View>
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
                <Text style={[styles.label, { color: colors.primary }]}>{label}</Text>
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
    // Centred on the icon, not on the item: the label sits below the pill and
    // keeps the page's text colour. The canvas is taller than the pill by the
    // glow's padding, so it starts that much higher again — the overhang above
    // the bar is the glow bleeding onto the content, which is what a glow does.
    top: BAR_PAD_TOP + ITEM_PAD_Y + ICON_SIZE / 2 - BLOB_H / 2 - GLOW_PAD_Y,
    width: CANVAS_W,
    height: CANVAS_H,
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
  discWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  discRing: {
    position: 'absolute',
    // 6dp of clearance on each side of the 56dp disc, which is what makes it
    // read as a ring around the button rather than a thicker border on it.
    top: -6,
    left: -6,
    height: 68,
    width: 68,
    borderRadius: 34,
    borderWidth: 2,
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
