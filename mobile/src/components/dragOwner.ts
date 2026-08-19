/**
 * Which draggable has the finger, if any.
 *
 * A module-level ref rather than context or state, because it is read inside
 * a responder negotiation — during `onMoveShouldSetPanResponderCapture`,
 * where a re-render has not happened and cannot be waited for.
 *
 * It exists to settle one conflict. On the Home screen a subject card sits
 * inside a block that is itself draggable, and the block claims the gesture
 * in the capture phase so a drag can start on any button inside it. Capture
 * runs parent-first, so without this the block would always win and a card
 * could never be picked up. The card claims on touch-down (bubble phase,
 * deepest first) and writes its name here; the block then sees the gesture is
 * already spoken for and declines to steal it.
 *
 * One finger, one drag, so one slot is enough.
 */
export const dragOwner: { current: string | null } = { current: null };
