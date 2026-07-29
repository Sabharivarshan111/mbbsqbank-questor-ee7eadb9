import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Rocket } from "lucide-react";

/**
 * One-time-per-release changelog card (no ads, ever).
 * Bump UPDATE_ID whenever a new changelog should be shown.
 */
const UPDATE_ID = "2026-07-29";
const FLAG_KEY = `orbit-update-log-${UPDATE_ID}`;

const CHANGES: string[] = [
  "Handwritten Notes now have a chat box — ask for a fix and we search the reference textbook first.",
  "Every suggestion shows what was found, with green Yes to add it and red No to reject it.",
  "Said No? We can search the internet for that point instead, then you approve it again.",
  "Triple-tap notes get the same chat box, and every answer is cached so rate limits are far rarer.",
  "Rate-limit messages now tell you exactly when to try again.",
];

export default function UpdateLogNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (localStorage.getItem(FLAG_KEY) === "shown") return;
        setOpen(true);
      } catch { /* ignore */ }
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  if (!open) return null;

  const close = () => {
    try { localStorage.setItem(FLAG_KEY, "shown"); } catch { /* ignore */ }
    setOpen(false);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[115] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="w-full max-w-sm rounded-3xl border-2 border-primary/40 bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-6">
          <div className="mx-auto h-14 w-14 rounded-full bg-gradient-to-br from-primary to-fuchsia-500 flex items-center justify-center mb-4">
            <Rocket className="h-7 w-7 text-primary-foreground" />
          </div>
          <h2 className="text-lg font-extrabold text-center mb-1">What's new today</h2>
          <p className="text-[11px] text-center text-muted-foreground mb-4">Update log · {UPDATE_ID}</p>
          <ul className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {CHANGES.map((c, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                <p className="text-sm leading-relaxed">{c}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11px] text-center text-muted-foreground/80">
            No ads in this popup. Thanks for your support 💜
          </p>
          <button
            onClick={close}
            className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-fuchsia-500 text-primary-foreground font-semibold text-sm active:scale-[0.98] transition"
          >
            OK, continue
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
