/**
 * FlatList tuning for long question lists on low-end hardware.
 *
 * The defaults are chosen for a mid-range phone: `windowSize: 21` keeps ten
 * screens of rows mounted either side of the viewport. A subject can carry
 * several hundred questions, and each row is a Pressable, two to four Text
 * nodes and an SVG icon — so those ten screens are hundreds of live views
 * doing nothing but occupying memory on exactly the devices that can least
 * afford it.
 *
 * Narrowing the window and clipping off-screen rows is the single biggest
 * scroll win available without changing the row markup. The numbers are
 * deliberately conservative: too small and a fast fling outruns the renderer,
 * showing blank cells — which is a worse regression than the memory it saves.
 *
 * Spread onto every FlatList that can hold more than a screenful:
 *
 *   <FlatList {...LIST_TUNING} … />
 */
export const LIST_TUNING = {
  /** Roughly two screens of rows on a 360dp-wide phone. */
  initialNumToRender: 12,
  /** Enough to stay ahead of a normal fling without long render bursts. */
  maxToRenderPerBatch: 8,
  /** ~2.5 screens either side of the viewport, down from the default 21. */
  windowSize: 7,
  /** Coalesce batches so a fling does not schedule work every frame. */
  updateCellsBatchingPeriod: 60,
  /** Detach off-screen rows from the native view hierarchy. */
  removeClippedSubviews: true,
} as const;
