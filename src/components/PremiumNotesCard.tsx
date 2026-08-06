import { useState } from "react";
import { BookOpen, Loader2, Lock, FolderOpen, AlertTriangle, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isNative, nativeGoogleSignIn } from "@/lib/native-auth";
import { useRazorpayTestCheckout } from "@/hooks/use-razorpay-test-checkout";
import { useNotesPurchase, PREMIUM_NOTES_DRIVE_URL } from "@/hooks/use-notes-purchase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="h-4 w-4">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.2 7.9 3l5.7-5.7A20 20 0 1 0 24 44c11 0 20-9 20-20 0-1.2-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3 0 5.8 1.2 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.3l-6.2-5.3A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.3C40.9 35.7 44 30.3 44 24c0-1.2-.1-2.4-.4-3.5z" />
  </svg>
);

/** Small pill on Home. Tap → checkout sheet for the ₹50 FM + SPM notes. */
export default function PremiumNotesCard() {
  const { startCheckout } = useRazorpayTestCheckout();
  const { owned, signedIn, refresh } = useNotesPurchase();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    setBusy(true);
    try {
      if (isNative()) await nativeGoogleSignIn();
      else await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Google sign-in unavailable.");
    } finally {
      setBusy(false);
    }
  };

  const buy = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const err = await startCheckout("notes_fmspm");
      if (err) toast.error(err);
      else {
        toast.success("Payment successful — your notes are unlocked!");
        await refresh();
        setOpen(false);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  if (owned) {
    return (
      <a
        href={PREMIUM_NOTES_DRIVE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3.5 active:scale-[0.99] transition shadow-[0_0_20px_-4px_hsl(var(--primary)/0.35)]"
      >
        <span className="h-9 w-9 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
          <FolderOpen className="h-4 w-4 text-emerald-500" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold leading-tight">FM + SPM notes unlocked</span>
          <span className="block text-[11px] text-muted-foreground leading-snug mt-0.5">
            Tap to open your Google Drive folder
          </span>
        </span>
        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">Open</span>
      </a>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative w-full text-left flex items-start gap-3 rounded-2xl border border-amber-400/50 bg-gradient-to-br from-amber-400/15 via-amber-500/10 to-orange-500/15 px-4 py-3.5 active:scale-[0.99] transition shadow-[0_0_24px_-2px_hsl(38_92%_50%/0.45)] animate-pulse-glow overflow-hidden"
      >
        <span className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-amber-400/25 blur-2xl" />
        <span className="h-10 w-10 rounded-full bg-amber-400/25 ring-1 ring-amber-400/50 flex items-center justify-center shrink-0">
          <BookOpen className="h-5 w-5 text-amber-500" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="block text-sm font-extrabold leading-tight">
              Get your FM &amp; SPM notes for ₹50 only
            </span>
          </span>
          <span className="block text-[11px] text-muted-foreground leading-snug mt-1">
            FM 160 pages · SPM 130 pages — revise the whole thing in one night. All important
            questions with answers, mnemonics &amp; easy flowcharts.
          </span>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-300">
            One-night revision
          </span>
        </span>
        <span className="shrink-0 self-center inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow">
          <Lock className="h-3 w-3" /> ₹50
        </span>
      </button>


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">FM + SPM revision notes — ₹50</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              One-time payment · lifetime access to the combined Forensic Medicine + SPM
              revision notes folder on Google Drive.
            </p>

            <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-[11px] leading-relaxed space-y-1">
              <p className="flex items-center gap-1.5 font-semibold">
                <Smartphone className="h-3.5 w-3.5" /> How to pay
              </p>
              <p>• Tap <strong>Pay ₹50</strong> — Razorpay opens with <strong>UPI</strong> (GPay / PhonePe / Paytm), cards, netbanking.</p>
              <p>• Pay with any UPI app; the notes unlock instantly on this account.</p>
            </div>

            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-600 dark:text-amber-400 space-y-1">
              <p className="flex items-start gap-1.5 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Before you pay, please read:
              </p>
              <p>• You <strong>must be signed in with Google</strong> so the notes stay unlocked on your account.</p>
              <p>• After paying, <strong>take a screenshot</strong> of the payment / UPI reference ID and send it to <strong>9080220563</strong> on WhatsApp if any issue arises.</p>
            </div>

            {!signedIn ? (
              <button
                onClick={() => void signIn()}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                {busy ? "Connecting…" : "Sign in with Google to continue"}
              </button>
            ) : (
              <button
                onClick={() => void buy()}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {busy ? "Opening checkout…" : "Pay ₹50 & unlock notes"}
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
