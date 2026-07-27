import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles } from "lucide-react";

const FLAG_KEY = "orbit-recovery-notice-v1";
const WALKTHROUGH_KEY = "orbit-walkthrough-completed-v2";
const PROFILE_KEY = "orbit-profile-local-v1";

function hasSkippedWalkthroughWithoutProfile(): boolean {
  try {
    const wt = localStorage.getItem(WALKTHROUGH_KEY);
    if (wt !== "true" && wt !== `"true"`) return false;
    const profile = localStorage.getItem(PROFILE_KEY);
    return !profile || profile === "null";
  } catch {
    return false;
  }
}

export default function RecoveryNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (localStorage.getItem(FLAG_KEY) === "shown") return;
        if (!hasSkippedWalkthroughWithoutProfile()) return;
        setOpen(true);
      } catch {
        // ignore
      }
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  if (!open) return null;

  const close = () => {
    try {
      localStorage.setItem(FLAG_KEY, "shown");
    } catch {
      // ignore
    }
    setOpen(false);
  };

  const node = (
    <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border-2 border-primary/40 bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-6 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-gradient-to-br from-primary to-fuchsia-500 flex items-center justify-center mb-4">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <h2 className="text-lg font-extrabold mb-2">We fixed a few things</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You can now open <span className="font-semibold text-foreground">My Progress</span> normally,
            and change your <span className="font-semibold text-foreground">default year</span> from the Home screen.
          </p>
          <p className="mt-3 text-[11px] text-muted-foreground/80">
            No ads will play for this popup.
          </p>
          <button
            onClick={close}
            className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-fuchsia-500 text-primary-foreground font-semibold text-sm active:scale-[0.98] transition"
          >
            OK, got it
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
