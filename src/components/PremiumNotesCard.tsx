import { useState } from "react";
import { BookOpen, Loader2, Lock, FolderOpen, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isNative, nativeGoogleSignIn } from "@/lib/native-auth";
import { useRazorpayTestCheckout } from "@/hooks/use-razorpay-test-checkout";
import { useNotesPurchase, PREMIUM_NOTES_DRIVE_URL } from "@/hooks/use-notes-purchase";

/** ₹50 one-time purchase: FM + SPM combined revision notes (Google Drive). */
export default function PremiumNotesCard() {
  const { startCheckout } = useRazorpayTestCheckout();
  const { owned, signedIn, refresh } = useNotesPurchase();
  const [busy, setBusy] = useState(false);

  const buy = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!signedIn) {
        toast.info("Sign in with Google first.");
        if (isNative()) await nativeGoogleSignIn();
        else await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.location.origin },
        });
        return;
      }
      const err = await startCheckout("notes_fmspm");
      if (err) toast.error(err);
      else {
        toast.success("Payment successful — your notes are unlocked!");
        await refresh();
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
        className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 active:scale-[0.99] transition"
      >
        <span className="h-8 w-8 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
          <FolderOpen className="h-4 w-4 text-emerald-500" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-tight">FM + SPM revision notes</span>
          <span className="block text-[11px] text-muted-foreground leading-tight">
            Unlocked — tap to open your Google Drive folder
          </span>
        </span>
        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">Open</span>
      </a>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 space-y-2">
      <button
        onClick={() => void buy()}
        disabled={busy}
        className="w-full flex items-center gap-3 text-left active:scale-[0.99] transition disabled:opacity-70"
      >
        <span className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          {busy ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <BookOpen className="h-4 w-4 text-primary" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-tight">
            FM + SPM revision combined — just ₹50
          </span>
          <span className="block text-[11px] text-muted-foreground leading-tight">
            One-time payment · lifetime access to the notes folder
          </span>
        </span>
        <span className="text-xs font-semibold text-primary shrink-0 flex items-center gap-1">
          <Lock className="h-3 w-3" /> Buy
        </span>
      </button>
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5 text-[11px] leading-relaxed text-amber-600 dark:text-amber-400 space-y-1">
        <p className="flex items-start gap-1.5 font-semibold">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          Before you pay, please read:
        </p>
        <p>• You <strong>must be signed in with Google</strong> so the notes stay unlocked on your account.</p>
        <p>• After paying, <strong>take a screenshot</strong> of the payment / UPI reference ID and send it to <strong>9080220563</strong> on WhatsApp if any issue arises.</p>
      </div>
    </div>
  );
}
