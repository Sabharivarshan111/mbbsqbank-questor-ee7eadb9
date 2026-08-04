import { useEffect, useState, useCallback } from "react";
import { ShieldCheck, Loader2, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";

type Row = {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  plan: string;
  amount_paise: number;
  razorpay_payment_id: string | null;
  starts_at: string;
  expires_at: string;
  active: boolean;
};

/** Admin-only: list every ad-free subscriber and revoke access. */
export default function AdminSubscribersCard() {
  const { isAdmin } = useIsAdmin();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("admin_list_subscriptions");
    if (error) toast.error(error.message);
    else setRows((data ?? []) as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  if (!isAdmin) return null;

  const revoke = async (id: string) => {
    const { error } = await (supabase as any).rpc("admin_revoke_subscription", { _id: id });
    if (error) toast.error(error.message);
    else {
      toast.success("Subscription revoked — ads are back on for that user.");
      void load();
    }
  };

  return (
    <section className="rounded-2xl border border-primary/30 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> Admin — ad-free subscribers
        </h2>
        <button onClick={() => void load()} className="p-2 rounded-lg hover:bg-muted" aria-label="Refresh">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </button>
      </div>

      {rows.length === 0 && !loading && (
        <p className="text-xs text-muted-foreground">No paid subscriptions yet.</p>
      )}

      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{r.display_name ?? "Unnamed"}</span>
              <span className={r.active ? "text-emerald-500 font-semibold" : "text-muted-foreground"}>
                {r.active ? "Active" : "Expired"}
              </span>
            </div>
            <div className="text-muted-foreground break-all">{r.email ?? "no email"}</div>
            <div className="text-muted-foreground break-all">
              ₹{(r.amount_paise / 100).toFixed(0)} · {r.plan} · {r.razorpay_payment_id ?? "—"}
            </div>
            <div className="text-muted-foreground">
              {new Date(r.starts_at).toLocaleDateString()} → {new Date(r.expires_at).toLocaleDateString()}
            </div>
            {r.active && (
              <button
                onClick={() => void revoke(r.id)}
                className="mt-1 inline-flex items-center gap-1 rounded-lg border border-destructive/50 px-2 py-1 font-semibold text-destructive"
              >
                <Trash2 className="h-3 w-3" /> Remove access
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
