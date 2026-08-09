import { useEffect } from "react";
import { popBackHandler } from "@/lib/back-stack";

/**
 * Register Capacitor hardware back button.
 * In-app back handlers take priority; then browser history; then exit.
 */
export function useCapacitorBack() {
  useEffect(() => {
    let handle: { remove: () => void } | null = null;
    let cancelled = false;

    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const res = await App.addListener("backButton", ({ canGoBack }) => {
          if (popBackHandler()) return;
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
