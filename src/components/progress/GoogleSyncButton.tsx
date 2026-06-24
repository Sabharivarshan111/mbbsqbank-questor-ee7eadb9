import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogOut, Check } from "lucide-react";
import { isNative, nativeGoogleSignIn } from "@/lib/native-auth";

interface Props {
  isAnonymous: boolean;
  email: string | null;
  userId: string | null;
  onSignOut: () => Promise<void> | void;
}

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="h-4 w-4">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.2 7.9 3l5.7-5.7A20 20 0 1 0 24 44c11 0 20-9 20-20 0-1.2-.1-2.4-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3 0 5.8 1.2 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.3l-6.2-5.3A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.3C40.9 35.7 44 30.3 44 24c0-1.2-.1-2.4-.4-3.5z"/>
  </svg>
);

const AUTH_RETURN_TAB_KEY = "orbit-auth-return-tab";
const PENDING_MERGE_USER_KEY = "orbit-pending-merge-user-id";

const GoogleSyncButton = ({ isAnonymous, email, userId, onSignOut }: Props) => {
  const [busy, setBusy] = useState(false);

  if (!isAnonymous && email) {
    return (
      <div className="rounded-2xl border bg-gradient-to-r from-emerald-500/10 via-primary/10 to-fuchsia-500/10 p-3 flex items-center gap-3 animate-fade-in">
        <div className="h-9 w-9 rounded-full bg-background flex items-center justify-center shrink-0">
          <Check className="h-5 w-5 text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Synced across devices</p>
          <p className="text-sm font-medium truncate">{email}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => onSignOut()} title="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const handleLink = async () => {
    setBusy(true);
    try {
      try {
        localStorage.setItem(AUTH_RETURN_TAB_KEY, "progress");
        if (isAnonymous && userId) localStorage.setItem(PENDING_MERGE_USER_KEY, userId);
      } catch {}

      if (isNative()) {
        await nativeGoogleSignIn();
        window.dispatchEvent(new CustomEvent("orbit:set-tab", { detail: "progress" }));
        toast.success("Signed in with Google. Your progress is syncing.");
        setBusy(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (e: any) {
      toast.error(e?.message ?? "Google sign-in unavailable. Enable Google provider in Supabase.");
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handleLink}
      disabled={busy}
      className="group relative w-full rounded-2xl p-[1.5px] bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-400 hover:shadow-[0_0_24px_hsl(var(--primary)/0.35)] transition-shadow animate-fade-in disabled:opacity-60"
    >
      <span className="flex items-center justify-center gap-2 rounded-2xl bg-background px-4 py-2.5 text-sm font-semibold group-hover:bg-background/90 transition-colors">
        <GoogleIcon />
        {busy ? "Connecting…" : "Sync with Google"}
      </span>
    </button>
  );
};

export default GoogleSyncButton;
