import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Year } from "@/lib/year-subjects";
import { YEAR_LABELS } from "@/lib/year-subjects";
import { validateDisplayName } from "@/lib/profanity";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { reconcileProgressWithCloud } from "@/lib/question-progress";
import { Loader2, Mail } from "lucide-react";

interface Props {
  open: boolean;
  initialName?: string;
  initialYear?: Year;
  onClose?: () => void;
  onSave: (name: string, year: Year) => Promise<void> | void;
  title?: string;
}

type Mode = "form" | "signin-email" | "signin-otp";

const OnboardingDialog = ({ open, initialName = "", initialYear = "first", onClose, onSave, title = "Welcome, future doctor 🩺" }: Props) => {
  const [name, setName] = useState(initialName);
  const [year, setYear] = useState<Year>(initialYear);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>("form");
  const [signInEmail, setSignInEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    const check = validateDisplayName(name);
    if (!check.ok) {
      setError(check.reason ?? "Invalid name.");
      toast({ title: "Choose a different name", description: check.reason, variant: "destructive" });
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave(name.trim(), year);
      onClose?.();
    } catch (e: any) {
      setError(e?.message ?? "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  const sendCode = async () => {
    const clean = signInEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      toast({ title: "Enter a valid email", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: clean,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setMode("signin-otp");
      toast({ title: "Code sent", description: "Check your email for the 6-digit code." });
    } catch (e: any) {
      toast({ title: e?.message ?? "Could not send code", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    const clean = signInEmail.trim().toLowerCase();
    const code = otp.trim();
    if (code.length < 6) {
      toast({ title: "Enter the 6-digit code", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { data: prevSession } = await supabase.auth.getSession();
      const oldUserId = prevSession.session?.user?.is_anonymous ? prevSession.session.user.id : null;

      const { data, error } = await supabase.auth.verifyOtp({
        email: clean,
        token: code,
        type: "email",
      });
      if (error) throw error;
      const newUserId = data.user?.id ?? null;

      if (oldUserId && newUserId && oldUserId !== newUserId) {
        const { error: mErr } = await (supabase as any).rpc("merge_into_current_user", {
          _old_user_id: oldUserId,
        });
        if (mErr) console.warn("Merge failed:", mErr.message);
      }

      if (newUserId) {
        await supabase.from("profiles").update({ email: clean }).eq("id", newUserId);
      }
      // Pull the cloud-only ticks onto this device.
      await reconcileProgressWithCloud(true);

      toast({ title: "Signed in", description: "Your progress is synced across devices." });
      setMode("form");
      setOtp("");
      setSignInEmail("");
      onClose?.();
    } catch (e: any) {
      toast({ title: e?.message ?? "Invalid code", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Track your progress, build streaks, and compete on the leaderboard.
          </DialogDescription>
        </DialogHeader>

        {mode === "form" && (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="dr-name">Name</Label>
              <Input
                id="dr-name"
                placeholder="Dr. ___"
                value={name}
                onChange={(e) => { setName(e.target.value); if (error) setError(null); }}
                maxLength={40}
                autoFocus
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Select value={year} onValueChange={(v) => setYear(v as Year)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(YEAR_LABELS) as Year[]).map((y) => (
                    <SelectItem key={y} value={y}>{YEAR_LABELS[y]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" disabled={!name.trim() || saving} onClick={handleSave}>
              {saving ? "Saving…" : "Continue"}
            </Button>

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <div className="flex-1 h-px bg-border" />
              <span>or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              type="button"
              onClick={() => setMode("signin-email")}
              className="w-full text-sm text-primary hover:underline"
            >
              Already have an account? Sign in to sync
            </button>
          </div>
        )}

        {mode === "signin-email" && (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Enter the email you used on your other device. We'll send a 6-digit code.
            </p>
            <Input
              type="email"
              placeholder="you@example.com"
              value={signInEmail}
              onChange={(e) => setSignInEmail(e.target.value)}
              autoFocus
            />
            <Button className="w-full" onClick={sendCode} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Mail className="h-4 w-4 mr-2" />Send code</>}
            </Button>
            <button
              type="button"
              onClick={() => setMode("form")}
              className="w-full text-xs text-muted-foreground hover:underline"
            >
              Back
            </button>
          </div>
        )}

        {mode === "signin-otp" && (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code sent to <span className="font-medium">{signInEmail}</span>.
            </p>
            <Input
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              autoFocus
            />
            <Button className="w-full" onClick={verifyCode} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & sync"}
            </Button>
            <button
              type="button"
              onClick={() => setMode("signin-email")}
              className="w-full text-xs text-muted-foreground hover:underline"
            >
              Back
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingDialog;
