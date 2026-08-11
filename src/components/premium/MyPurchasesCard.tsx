import { useEffect, useState, useCallback } from "react";
import { ShoppingBag, Loader2, ExternalLink, ShieldCheck, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NOTES_DRIVE_URL, type NotesPlan } from "@/hooks/use-notes-purchase";

type Sub = {
  plan: string;
  amount_paise: number;
  starts_at: string;
  expires_at: string;
  razorpay_payment_id: string | null;
};

const PLAN_LABEL: Record<string, string> = {
  notes_fmspm: "FM + SPM revision notes (3rd year)",
  notes_pharmac: "Pharmacology full-subject notes (2nd year)",
  adfree_monthly: "Ad-free plan",
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** "My purchases" — every unlock on the signed-in account, with Drive links. */
export default function MyPurchasesCard() {
  const [rows, setRows] = useState<Sub[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setSignedIn(!!user);
      if (!user) { setRows([]); return; }
      const { data } = await supabase
        .from("premium_subscriptions")
        .select("plan, amount_paise, starts_at, expires_at, razorpay_payment_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setRows((data ?? []) as Sub[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { void load(); });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  if (!signedIn || (!loading && rows.length === 0)) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-bold text-sm inline-flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-primary" /> My purchases
        </p>
        <button
          onClick={() => void load()}
          className="text-[11px] font-semibold text-primary inline-flex items-center gap-1"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Refresh
        </button>
      </div>

      {loading && rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">Loading your unlocks…</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => {
            const active = new Date(r.expires_at).getTime() > Date.now();
            const driveUrl = NOTES_DRIVE_URL[r.plan as NotesPlan];
            const lifetime = new Date(r.expires_at).getFullYear() > 2100;
            return (
              <div
                key={`${r.plan}-${i}`}
                className={`rounded-xl border p-3 space-y-1.5 ${
                  active ? "border-emerald-500/40 bg-emerald-500/10" : "border-border/60 bg-muted/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold leading-snug">
                    {PLAN_LABEL[r.plan] ?? r.plan}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      active
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {active ? "Active" : "Expired"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  ₹{Math.round(r.amount_paise / 100)} · bought {fmt(r.starts_at)} ·{" "}
                  {lifetime ? "lifetime access" : `valid till ${fmt(r.expires_at)}`}
                </p>
                {r.razorpay_payment_id && (
                  <p className="text-[10px] text-muted-foreground/80 break-all">
                    Payment ID: {r.razorpay_payment_id.split(":")[0]}
                  </p>
                )}
                {driveUrl && active && (
                  <a
                    href={driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white active:scale-95 transition"
                  >
                    <ExternalLink className="h-3 w-3" /> Open my notes folder
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground inline-flex items-start gap-1.5">
        <ShieldCheck className="h-3 w-3 mt-0.5 shrink-0" />
        Your unlocks are tied to this Google account. Every purchase goes towards developing and
        maintaining Orbit.
      </p>
    </div>
  );
}
