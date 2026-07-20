import { useEffect } from "react";

/**
 * Register Capacitor hardware back button.
 * If in-app history can go back, pop it; otherwise exit the app.
 */
export function useCapacitorBack() {
  useEffect(() => {
    let handle: { remove: () => void } | null = null;
    let cancelled = false;

    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const res = await App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            App.exitApp();
          }
        });
        if (cancelled) {
          res.remove();
        } else {
          handle = res;
        }
      } catch {
        /* not running under Capacitor */
      }
    })();

    return () => {
      cancelled = true;
      handle?.remove();
    };
  }, []);
}
