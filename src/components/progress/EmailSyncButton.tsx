import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { reconcileProgressWithCloud } from "@/lib/question-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, Check, LogOut, Loader2 } from "lucide-react";

interface Props {
  isAnonymous: boolean;
  email: string | null;
  userId: string | null;
  onSignOut: () => Promise<void> | void;
}

const EmailSyncButton = ({ isAnonymous, email, userId, onSignOut }: Props) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"email" | "otp">("email");
  const [emailInput, setEmailInput] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  // Already linked
  if (!isAnonymous && email) {
    return (
      <div className="rounded-2xl border bg-gradient-to-r from-sky-500/10 via-primary/10 to-emerald-500/10 p-3 flex items-center gap-3 animate-fade-in">
        <div className="h-9 w-9 rounded-full bg-background flex items-center justify-center shrink-0">
          <Check className="h-5 w-5 text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Progress synced via email</p>
          <p className="text-sm font-medium truncate">{email}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => onSignOut()} title="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const sendCode = async () => {
    const clean = emailInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      toast.error("Enter a valid email address");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: clean,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      toast.success("Verification code sent. Check your inbox.");
      setStep("otp");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not send code");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    const clean = emailInput.trim().toLowerCase();
    const code = otp.trim();
    if (code.length < 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    const oldUserId = userId;
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: clean,
        token: code,
        type: "email",
      });
      if (error) throw error;
      const newUserId = data.user?.id ?? null;

      // Merge previous anonymous progress into the now signed-in account
      if (oldUserId && newUserId && oldUserId !== newUserId) {
        const { error: mErr } = await (supabase as any).rpc("merge_into_current_user", {
          _old_user_id: oldUserId,
        });
        if (mErr) {
          console.warn("Merge failed:", mErr.message);
          toast.warning("Signed in, but couldn't merge previous progress.");
        } else {
          toast.success("Progress merged from this device.");
        }
      } else {
        toast.success("Signed in. Your progress is now synced across devices.");
      }

      // Update displayed email column in profile
      if (newUserId) {
        await supabase.from("profiles").update({ email: clean }).eq("id", newUserId);
      }

      // Pull the merged cloud progress onto this device.
      await reconcileProgressWithCloud(true);


      setOpen(false);
      setStep("email");
      setOtp("");
      setEmailInput("");
    } catch (e: any) {
      toast.error(e?.message ?? "Invalid code");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="group relative w-full rounded-2xl p-[1.5px] bg-gradient-to-r from-sky-500 via-primary to-emerald-400 hover:shadow-[0_0_24px_hsl(var(--primary)/0.35)] transition-shadow animate-fade-in"
      >
        <span className="flex items-center justify-center gap-2 rounded-2xl bg-background px-4 py-2.5 text-sm font-semibold group-hover:bg-background/90 transition-colors">
          <Mail className="h-4 w-4" />
          Sync progress with email
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-3 space-y-3 animate-fade-in">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">
          {step === "email" ? "Sync across devices" : "Enter the 6-digit code"}
        </p>
      </div>

      {step === "email" ? (
        <>
          <p className="text-xs text-muted-foreground">
            Enter your email. We'll send a code so this device shares progress with your other devices.
          </p>
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            disabled={busy}
          />
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" className="flex-1" onClick={sendCode} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send code"}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Code sent to <span className="font-medium">{emailInput}</span>
          </p>
          <Input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            disabled={busy}
          />
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStep("email")} disabled={busy}>
              Back
            </Button>
            <Button size="sm" className="flex-1" onClick={verify} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & sync"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default EmailSyncButton;
