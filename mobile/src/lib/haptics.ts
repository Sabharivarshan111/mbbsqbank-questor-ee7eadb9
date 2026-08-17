import { Platform, Vibration } from 'react-native';

/**
 * Haptics.
 *
 * Deliberately built on React Native's core `Vibration` API rather than
 * `react-native-haptic-feedback`. That library gives access to Android's
 * HapticFeedbackConstants — a genuinely nicer "tick" — but it is another
 * native module to compile, shim in the preview harness, and carry on every
 * low-end device, for a refinement most users will not name. Core API, no new
 * dependency.
 *
 * ## The rule these obey
 *
 * Feedback is only added where it earns its place (apple-design §13 Utility).
 * Over-feedback trains people to ignore all of it, so the bar is: a *commit* —
 * a deliberate state change the user just made — or a *completion*. Not
 * navigation, not scrolling, not every tap. Two callers today:
 *
 *   • `tick()`     — switching theme. A commit.
 *   • `complete()` — a focus session ending. A completion.
 *
 * Anything new has to clear the same bar.
 *
 * ## Known limitation, stated plainly
 *
 * Android has a system-wide "touch feedback" setting, and `Vibration.vibrate`
 * ignores it — it will fire even for someone who turned haptics off. Reading
 * that setting needs a native module, which is the thing this file exists to
 * avoid. So the mitigation is restraint: the pulses are as short as they can be
 * while still registering, and there are only two of them in the whole app.
 * If a user-facing "haptics off" switch is ever wanted, this is the one place
 * to gate.
 */

/**
 * The shortest pulse that reliably registers as a tick rather than a buzz.
 * Below roughly 8ms many Android motors do not spin up at all; much above 20ms
 * and it stops feeling like a tap and starts feeling like an alert.
 */
const TICK_MS = 10;

/** Pattern for a finished session: two short pulses, not one long alarm. */
const COMPLETE_PATTERN = [0, 180, 120, 180];

/** A single light tap. For committing a deliberate choice. */
export function tick(): void {
  if (Platform.OS !== 'android') {
    return;
  }
  try {
    Vibration.vibrate(TICK_MS);
  } catch {
    // Never let feedback break the action it is decorating.
  }
}

/** A finished focus session. Longer, because it fires with the screen away. */
export function complete(): void {
  if (Platform.OS !== 'android') {
    return;
  }
  try {
    Vibration.vibrate(COMPLETE_PATTERN);
  } catch {
    // Non-fatal.
  }
}
