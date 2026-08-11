import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Rocket, X } from "lucide-react";
import { WhatsAppGroupCard } from "@/components/community/CommunityCards";
import { useProfile } from "@/hooks/use-profile";

/**
 * One-time-per-release changelog card (no ads, ever).
 * Bump UPDATE_ID whenever a new changelog should be shown.
 */
const UPDATE_ID = "2026-08-11";
const FLAG_KEY = `orbit-update-log-${UPDATE_ID}`;

const CHANGES_SECOND_YEAR: string[] = [
  "NEW for 2nd year: Pharmacology full-subject notes (\u20b9100) \u2014 all chapters from K.D. Tripathi + Tara Shanbhag, under 150 pages, important questions with answers. Tap the notes card on Home.",
  "Buying the Pharmacology notes also unlocks 1 month ad-free, free.",
  "New WhatsApp group for 2nd year students \u2014 study materials, notes and exam updates. Tap the WhatsApp card on Home or in Notes to join (Play Store version only).",
  "My Progress now has a \"My purchases\" box showing every unlock on your account with a direct link to your notes folder.",
  "Fixed: ads no longer appear after buying notes \u2014 your complimentary ad-free month now applies immediately.",
];

const CHANGES_DEFAULT: string[] = [
  "My Progress now has a \"My purchases\" box showing every unlock on your account with a direct link to your notes folder.",
  "Fixed: ads no longer appear after buying notes \u2014 your complimentary ad-free month now applies immediately.",
  "3rd year: FM + SPM revision notes bundle (\u20b950) \u2014 MCQs, previous-year MCQs and predicted papers included, plus 1 month ad-free free.",
  "New WhatsApp group for 2nd year students, alongside the existing 3rd year group.",
  "Account security hardened \u2014 profiles and merge actions are locked to their owner.",
];


export default function UpdateLogNotice() {
  const { local } = useProfile();
  const [open, setOpen] = useState(false);
  const isSecondYear = local?.year === "second";
  const CHANGES = isSecondYear ? CHANGES_SECOND_YEAR : CHANGES_DEFAULT;

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
      <div
        className="relative w-full max-w-sm flex flex-col rounded-3xl border-2 border-primary/40 bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
        style={{ maxHeight: "min(80vh, 560px)" }}
      >
        {/* Always-reachable close button */}
        <button
          onClick={close}
          aria-label="Close update log"
          className="absolute right-3 top-3 z-10 h-9 w-9 rounded-full bg-background/80 border border-border/60 flex items-center justify-center active:scale-95 transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 pt-6">
          <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-br from-primary to-fuchsia-500 flex items-center justify-center mb-3">
            <Rocket className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="text-lg font-extrabold text-center mb-1">What's new today</h2>
          <p className="text-[11px] text-center text-muted-foreground mb-4">Update log · {UPDATE_ID}</p>
          <ul className="space-y-2.5">
            {CHANGES.map((c, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                <p className="text-sm leading-relaxed">{c}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <WhatsAppGroupCard
              year={isSecondYear ? "second" : "third"}
              note={
                isSecondYear
                  ? "New: WhatsApp group for 2nd year students \u2014 study materials, notes and exam updates."
                  : "WhatsApp group for 3rd year students \u2014 study materials, notes and exam updates."
              }
            />
          </div>
          <p className="mt-4 text-[11px] text-center text-muted-foreground/80">
            No ads in this popup. Thanks for your support 💜
          </p>
        </div>

        {/* Pinned footer — always visible, centered */}
        <div className="shrink-0 border-t border-border/60 bg-card p-4 flex justify-center">
          <button
            onClick={close}
            className="w-full max-w-[240px] py-2.5 rounded-xl bg-gradient-to-r from-primary to-fuchsia-500 text-primary-foreground font-semibold text-sm active:scale-[0.98] transition"
          >
            OK, continue
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

