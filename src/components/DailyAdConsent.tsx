import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DAILY_AD_EVENT, type DailyAdConsentPayload } from "@/lib/daily-ad";

/**
 * Global full-screen blocking dialog shown once per day before a rewarded ad.
 * There is intentionally NO close (X) affordance — only "OK, continue".
 */
export default function DailyAdConsent() {
  const [payload, setPayload] = useState<DailyAdConsentPayload | null>(null);

  useEffect(() => {
    const h = (e: Event) => {
      const detail = (e as CustomEvent<DailyAdConsentPayload>).detail;
      if (!detail) return;
      setPayload(detail);
    };
    window.addEventListener(DAILY_AD_EVENT, h);
    return () => window.removeEventListener(DAILY_AD_EVENT, h);
  }, []);

  if (!payload) return null;

  const handleOk = () => {
    const { onConfirm } = payload;
    setPayload(null);
    // Fire after unmount so the ad UI takes over cleanly
    setTimeout(onConfirm, 30);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-ad-title"
      style={{ position: "fixed", inset: 0, zIndex: 2147483600 }}
      className="flex items-center justify-center p-5 bg-black/70 backdrop-blur-md animate-fade-in"
    >
      <div className="w-full max-w-sm rounded-3xl border border-primary/40 bg-card p-6 shadow-2xl text-center space-y-4 animate-scale-in">
        <div className="mx-auto h-14 w-14 rounded-full bg-gradient-to-br from-primary to-fuchsia-500 flex items-center justify-center text-2xl shadow-lg">
          🎬
        </div>
        <h2 id="daily-ad-title" className="text-lg font-extrabold bg-gradient-to-r from-primary to-fuchsia-400 bg-clip-text text-transparent">
          {payload.title}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{payload.message}</p>
        <button
          onClick={handleOk}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-fuchsia-500 text-primary-foreground font-semibold shadow-lg shadow-primary/30 active:scale-[0.98] transition"
        >
          OK, continue
        </button>
        <RemoveAdsButton onDone={handleOk} />
      </div>
    </div>,
    document.body,
  );
}
