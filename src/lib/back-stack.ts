type Handler = () => boolean;

type Entry = { fn: Handler; consumed: boolean };

const stack: Entry[] = [];

/**
 * In-app back handlers, mirrored onto the browser history stack.
 *
 * Why the history mirror: in-app navigation is plain React state, so the
 * history stack never grows. Capacitor's `canGoBack` stays false and — in
 * plain Android WebView wrappers, where the Capacitor `backButton` event
 * never fires at all — the system back closes the app immediately. By
 * pushing a synthetic history entry per handler, the native back gesture
 * produces a `popstate` we can intercept in BOTH runtimes.
 */
let suppressPopstate = 0;

export function pushBackHandler(fn: Handler) {
  const entry: Entry = { fn, consumed: false };
  stack.push(entry);
  try {
    window.history.pushState({ orbitBack: stack.length }, "");
  } catch { /* ignore */ }

  return () => {
    const i = stack.indexOf(entry);
    if (i === -1) return;
    stack.splice(i, 1);
    if (entry.consumed) return;
    // Closed from in-app UI (on-screen back arrow / tab tap): drop the
    // synthetic history entry without re-running any handler.
    suppressPopstate++;
    try {
      window.history.back();
    } catch {
      suppressPopstate--;
    }
  };
}

/** Runs the innermost handler. Returns true when it handled the back press. */
function runTop(): boolean {
  const entry = stack[stack.length - 1];
  if (!entry) return false;
  entry.consumed = true;
  stack.pop();
  return entry.fn();
}

/**
 * For the Capacitor `backButton` event (no popstate is emitted there), so we
 * also consume the synthetic history entry ourselves.
 */
export function popBackHandler(): boolean {
  if (!stack.length) return false;
  const handled = runTop();
  if (handled) {
    suppressPopstate++;
    try {
      window.history.back();
    } catch {
      suppressPopstate--;
    }
  }
  return handled;
}

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    if (suppressPopstate > 0) {
      suppressPopstate--;
      return;
    }
    runTop();
  });
}
