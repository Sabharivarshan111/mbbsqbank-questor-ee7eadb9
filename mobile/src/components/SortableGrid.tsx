import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { dragOwner } from '@/components/dragOwner';
import { SPRING, springConfig, springTo, useReducedMotion } from '@/theme/motion';

/**
 * Drag-to-reorder for a grid of same-sized tiles.
 *
 * The vertical sibling of this is `Reorderable`, and the two differ in one
 * way that changes all the arithmetic: there the blocks are wildly different
 * heights and have to be measured, here every tile is the same size, so a
 * slot is a row and a column and the whole layout comes from one measurement
 * of the container's width.
 *
 * It keeps the same rule as `Reorderable`, for the same reason: **the tiles
 * are always rendered in the order given by `rendered`, and where they appear
 * is a transform.** Committing a drop changes nothing on screen, and every
 * tile that moves out of the way moves on the native driver — which matters
 * more here than anywhere else in the app, because each of these tiles is a
 * holographic card with its own SVG and its own running animation. Reordering
 * them by re-rendering would tear all six down and build them again.
 *
 * The dragged tile claims the gesture on touch-down in the capture phase, so
 * it beats the `Touchable` inside it, and writes to `dragOwner` so the block
 * around it knows not to steal the drag. See dragOwner.ts.
 */

export interface SortableGridProps<Id extends string> {
  /** Render order. Fixed for the life of the screen. */
  rendered: Id[];
  order: Id[];
  onOrderChange: (next: Id[]) => void;
  editing: boolean;
  columns: number;
  /** Tile height in dp. Every tile is this tall. */
  itemHeight: number;
  /** Vertical space between rows, in dp. */
  rowGap: number;
  /** Tile width as a fraction of the container. The rest is the gutter. */
  widthRatio: number;
  renderItem: (id: Id) => React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SortableGrid<Id extends string>({
  rendered,
  order,
  onOrderChange,
  editing,
  columns,
  itemHeight,
  rowGap,
  widthRatio,
  renderItem,
  style,
}: SortableGridProps<Id>) {
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);

  const offsets = useRef(new Map<Id, Animated.ValueXY>()).current;
  const lifts = useRef(new Map<Id, Animated.Value>()).current;
  const [held, setHeld] = useState<Id | null>(null);

  const offsetFor = useCallback(
    (id: Id): Animated.ValueXY => {
      const existing = offsets.get(id);
      if (existing) {
        return existing;
      }
      const created = new Animated.ValueXY({ x: 0, y: 0 });
      offsets.set(id, created);
      return created;
    },
    [offsets],
  );
  const liftFor = useCallback(
    (id: Id): Animated.Value => {
      const existing = lifts.get(id);
      if (existing) {
        return existing;
      }
      const created = new Animated.Value(0);
      lifts.set(id, created);
      return created;
    },
    [lifts],
  );

  const cell = width * widthRatio;
  const stepX = columns > 1 ? (width - cell) / (columns - 1) : 0;
  const stepY = itemHeight + rowGap;

  /** Where slot `index` sits, relative to the container. */
  const slotAt = useCallback(
    (index: number) => ({
      x: (index % columns) * stepX,
      y: Math.floor(index / columns) * stepY,
    }),
    [columns, stepX, stepY],
  );

  /** Move every tile to where `list` puts it, except the one being dragged. */
  const settle = useCallback(
    (list: Id[], except?: Id) => {
      for (const id of rendered) {
        if (id === except) {
          continue;
        }
        const from = slotAt(rendered.indexOf(id));
        const to = slotAt(list.indexOf(id));
        const value = offsetFor(id);
        springTo(value.x, to.x - from.x, { spring: SPRING.default, reduceMotion }).start();
        springTo(value.y, to.y - from.y, { spring: SPRING.default, reduceMotion }).start();
      }
    },
    [offsetFor, reduceMotion, rendered, slotAt],
  );

  const responders = useMemo(() => {
    const map = {} as Record<Id, ReturnType<typeof PanResponder.create>>;
    for (const id of rendered) {
      let tentative = order;
      let start = { x: 0, y: 0 };

      map[id] = PanResponder.create({
        // Capture on both, so the tile is picked up rather than the
        // Touchable inside it taking the touch first.
        //
        // Move as well as start, because of how edit mode is entered: you
        // hold a card, and the mode only exists *after* the finger is already
        // down. A start-only claim can never fire for that finger, and the
        // block around the card would take the drag instead — you would hold
        // a card and end up moving the whole grid.
        onStartShouldSetPanResponderCapture: () => {
          if (!editing) {
            return false;
          }
          // Also claimed here, not only in onTouchStart: a pointer that is not
          // a finger never fires touch events at all, and without this the
          // block would still steal the gesture on the first move.
          dragOwner.current = id;
          return true;
        },
        onMoveShouldSetPanResponderCapture: () => editing,
        onPanResponderGrant: () => {
          tentative = order;
          const from = slotAt(rendered.indexOf(id));
          const to = slotAt(order.indexOf(id));
          start = { x: to.x - from.x, y: to.y - from.y };
          const value = offsetFor(id);
          value.x.stopAnimation();
          value.y.stopAnimation();
          value.setValue(start);
          setHeld(id);
          if (!reduceMotion) {
            Animated.spring(liftFor(id), {
              toValue: 1,
              ...springConfig(SPRING.snappy),
            }).start();
          }
        },
        onPanResponderMove: (_event, gesture) => {
          const value = offsetFor(id);
          value.setValue({ x: start.x + gesture.dx, y: start.y + gesture.dy });

          // Which cell the tile's middle is over. Uniform tiles, so this is
          // division rather than a walk — the reference's own slot maths.
          const from = slotAt(rendered.indexOf(id));
          const cx = from.x + start.x + gesture.dx + cell / 2;
          const cy = from.y + start.y + gesture.dy + itemHeight / 2;
          const col = Math.max(0, Math.min(columns - 1, Math.floor(cx / (stepX || 1))));
          const row = Math.max(
            0,
            Math.min(Math.ceil(rendered.length / columns) - 1, Math.floor(cy / stepY)),
          );
          const target = Math.max(0, Math.min(rendered.length - 1, row * columns + col));
          const current = tentative.indexOf(id);
          if (target !== current) {
            const next = [...tentative];
            next.splice(current, 1);
            next.splice(target, 0, id);
            tentative = next;
            settle(tentative, id);
          }
        },
        onPanResponderRelease: () => {
          dragOwner.current = null;
          setHeld(null);
          if (!reduceMotion) {
            Animated.spring(liftFor(id), {
              toValue: 0,
              ...springConfig(SPRING.dismiss),
            }).start();
          } else {
            liftFor(id).setValue(0);
          }
          const from = slotAt(rendered.indexOf(id));
          const to = slotAt(tentative.indexOf(id));
          const value = offsetFor(id);
          springTo(value.x, to.x - from.x, { spring: SPRING.momentum, reduceMotion }).start();
          springTo(value.y, to.y - from.y, { spring: SPRING.momentum, reduceMotion }).start();
          if (tentative !== order) {
            onOrderChange(tentative);
          }
        },
        onPanResponderTerminate: () => {
          dragOwner.current = null;
          setHeld(null);
          liftFor(id).setValue(0);
        },
        onPanResponderTerminationRequest: () => false,
      });
    }
    return map;
  }, [
    cell,
    columns,
    editing,
    itemHeight,
    liftFor,
    offsetFor,
    onOrderChange,
    order,
    reduceMotion,
    rendered,
    settle,
    slotAt,
    stepX,
    stepY,
  ]);

  return (
    <View
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      style={style}>
      {rendered.map(id => {
        const offset = offsetFor(id);
        const lift = liftFor(id);
        return (
          <Animated.View
            key={id}
            style={[
              styles.tile,
              {
                width: `${widthRatio * 100}%`,
                height: itemHeight,
                zIndex: held === id ? 2 : 1,
                transform: [
                  { translateX: offset.x },
                  { translateY: offset.y },
                  // Lifts towards the finger rather than appearing: the tile
                  // was already on screen, so it grows from 1.
                  { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
                ],
              },
            ]}
            // Claimed on touch-down, before anything is dragged and whether
            // or not the mode is on yet. It is what tells the block around
            // this grid that the finger is spoken for — capture runs
            // parent-first, so without it the block steals every gesture and
            // a card can never be picked up. See dragOwner.ts.
            onTouchStart={() => {
              dragOwner.current = id;
            }}
            onTouchEnd={() => {
              dragOwner.current = null;
            }}
            onTouchCancel={() => {
              dragOwner.current = null;
            }}
            {...responders[id].panHandlers}>
            {renderItem(id)}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    marginBottom: 0,
  },
});
