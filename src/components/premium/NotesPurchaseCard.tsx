import { useEffect, useState } from "react";
import { Loader2, Lock, AlertTriangle, Smartphone, PartyPopper, RotateCcw, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isNative, nativeGoogleSignIn } from "@/lib/native-auth";
import { useRazorpayTestCheckout } from "@/hooks/use-razorpay-test-checkout";
import { useNotesPurchase, NOTES_DRIVE_URL, type NotesPlan } from "@/hooks/use-notes-purchase";
import { useProfile } from "@/hooks/use-profile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="h-4 w-4">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.2 7.9 3l5.7-5.7A20 20 0 1 0 24 44c11 0 20-9 20-20 0-1.2-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3 0 5.8 1.2 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.3l-6.2-5.3A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.3C40.9 35.7 44 30.3 44 24c0-1.2-.1-2.4-.4-3.5z" />
  </svg>
);

export interface NotesPlanCopy {
  plan: NotesPlan;
  priceLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  cardTitle: React.ReactNode;
  cardBody: React.ReactNode;
  badges: { text: string; tone: "amber" | "emerald" }[];
  dialogTitle: string;
  dialogBody: React.ReactNode;
  ownedTitle: string;
  ownedBody: React.ReactNode;
  payLabel: string;
  showRestore?: boolean;
}

const BADGE_TONE: Record<"amber" | "emerald", string> = {
  amber: "bg-amber-500/20 text-amber-600 dark:text-amber-300",
  emerald: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300",
};

/** Shared purchase card + checkout sheet for the year-specific notes bundles. */
export default function NotesPurchaseCard({ copy }: { copy: NotesPlanCopy }) {
  const { startCheckout } = useRazorpayTestCheckout();
  const { owned, signedIn, refresh } = useNotesPurchase(copy.plan);
  const { local, saveProfile } = useProfile();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [nameSaved, setNameSaved] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingNames, setLoadingNames] = useState(false);
  const Icon = copy.icon;

  useEffect(() => {
    if (open) {
      setName(local?.display_name ?? "");
      setNameSaved(!!local?.display_name);
    }
  }, [open, local?.display_name]);

  const suggest = async () => {
    setLoadingNames(true);
    try {
      const { data } = await supabase.functions.invoke("nickname-suggest", {
        body: { seed: name || local?.display_name || "", year: local?.year ?? "" },
      });
      const names = (data as any)?.names;
      if (Array.isArray(names) && names.length) setSuggestions(names);
    } catch { /* silent */ } finally {
      setLoadingNames(false);
    }
  };

  useEffect(() => {
    if (open && signedIn && suggestions.length === 0) void suggest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, signedIn]);

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

  const saveName = async () => {
    const clean = name.trim();
    if (clean.length < 2) { toast.error("Enter at least 2 characters."); return; }
    setBusy(true);
    try {
      await saveProfile({ display_name: clean, year: local?.year ?? "second" });
      setNameSaved(true);
      toast.success("Name saved!");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save that name.");
    } finally {
      setBusy(false);
    }
  };

  const buy = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const err = await startCheckout(copy.plan);
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

  const restore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("razorpay-restore-purchase", { body: {} });
      let msg: string | null = (data as any)?.error ?? null;
      if (!msg && error) {
        const ctx: any = (error as any)?.context;
        try { msg = JSON.parse(await ctx?.text?.())?.error ?? error.message; } catch { msg = error.message; }
      }
      if (msg) { toast.error(msg); return; }
      toast.success("Payment found — your notes are unlocked!");
      await refresh();
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not restore your purchase.");
    } finally {
      setBusy(false);
    }
  };

  if (owned) {
    return (
      <a
        href={NOTES_DRIVE_URL[copy.plan]}
        target="_blank"
        rel="noopener noreferrer"
        className="relative flex items-start gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3.5 active:scale-[0.99] transition shadow-[0_0_24px_-4px_hsl(150_80%_45%/0.45)] overflow-hidden"
      >
        <span className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-emerald-400/25 blur-2xl" />
        <span className="h-10 w-10 rounded-full bg-emerald-500/20 ring-1 ring-emerald-500/40 flex items-center justify-center shrink-0">
          <PartyPopper className="h-5 w-5 text-emerald-500" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold leading-tight">{copy.ownedTitle}</span>
          <span className="block text-[11px] text-muted-foreground leading-snug mt-1">{copy.ownedBody}</span>
        </span>
        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 self-center">Open</span>
      </a>
    );
  }

  const canPay = signedIn && nameSaved && name.trim().length >= 2;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative w-full text-left flex items-start gap-3 rounded-2xl border border-amber-400/50 bg-gradient-to-br from-amber-400/15 via-amber-500/10 to-orange-500/15 px-4 py-3.5 active:scale-[0.99] transition shadow-[0_0_24px_-2px_hsl(38_92%_50%/0.45)] animate-pulse-glow overflow-hidden"
      >
        <span className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-amber-400/25 blur-2xl" />
        <span className="h-10 w-10 rounded-full bg-amber-400/25 ring-1 ring-amber-400/50 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-amber-500" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold leading-tight">{copy.cardTitle}</span>
          <span className="block text-[11px] text-muted-foreground leading-snug mt-1">{copy.cardBody}</span>
          <span className="mt-2 flex flex-wrap gap-1.5">
            {copy.badges.map((b) => (
              <span
                key={b.text}
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${BADGE_TONE[b.tone]}`}
              >
                {b.text}
              </span>
            ))}
          </span>
        </span>
        <span className="shrink-0 self-center inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow">
          <Lock className="h-3 w-3" /> {copy.priceLabel}
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{copy.dialogTitle}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">{copy.dialogBody}</p>

            <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-[11px] leading-relaxed space-y-1">
              <p className="flex items-center gap-1.5 font-semibold">
                <Smartphone className="h-3.5 w-3.5" /> How to pay
              </p>
              <p>• Tap <strong>Pay {copy.priceLabel}</strong> — Razorpay opens with <strong>UPI</strong> (GPay / PhonePe / Paytm), cards, netbanking.</p>
              <p>• Pay with any UPI app; the notes unlock instantly on this account.</p>
            </div>

            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-600 dark:text-amber-400 space-y-1">
              <p className="flex items-start gap-1.5 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Before you pay, please read:
              </p>
              <p>• You <strong>must be signed in with Google</strong> and have a name set, so the notes stay unlocked on your account.</p>
              <p>• After paying, <strong>take a screenshot</strong> of the payment / UPI reference ID and send it to <strong>9080220563</strong> on WhatsApp if any issue arises.</p>
            </div>

            {/* Step 1 — Google sign-in */}
            {!signedIn ? (
              <button
                onClick={() => void signIn()}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                {busy ? "Connecting…" : "Step 1 · Sign in with Google"}
              </button>
            ) : (
              <>
                {/* Step 2 — name / nickname */}
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">
                  <p className="text-[11px] font-semibold">Step 2 · Your name on the notes account</p>
                  <div className="flex gap-2">
                    <input
                      value={name}
                      onChange={(e) => { setName(e.target.value); setNameSaved(false); }}
                      placeholder="Your name or a nickname"
                      className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => void saveName()}
                      disabled={busy || nameSaved}
                      className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
                    >
                      {nameSaved ? "Saved" : "Save"}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> AI nickname ideas
                    </p>
                    <button
                      onClick={() => void suggest()}
                      disabled={loadingNames}
                      className="text-[10px] font-semibold inline-flex items-center gap-1 text-primary disabled:opacity-50"
                    >
                      {loadingNames ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      More
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => { setName(s); setNameSaved(false); }}
                        className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium active:scale-95 transition"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 3 — pay */}
                <button
                  onClick={() => void buy()}
                  disabled={busy || !canPay}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  {busy ? "Opening checkout…" : copy.payLabel}
                </button>
                {!nameSaved && (
                  <p className="text-[10px] text-muted-foreground text-center">Save your name to continue to payment.</p>
                )}

                {copy.showRestore !== false && (
                  <button
                    onClick={() => void restore()}
                    disabled={busy}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    Already paid? Restore my access
                  </button>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
