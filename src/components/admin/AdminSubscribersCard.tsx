import { useEffect, useState, useCallback } from "react";
import { ShieldCheck, Loader2, Trash2, RefreshCw, BookOpen, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";

type Row = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  notes_active: boolean;
  adfree_active: boolean;
  notes_expires_at: string | null;
  adfree_expires_at: string | null;
  notes_plans: string | null;
  total_paise: number;
  payment_ids: string | null;
  first_purchase: string;
};

/** Admin-only: one row per buyer, showing which unlocks are active. */
export default function AdminSubscribersCard() {
  const { isAdmin } = useIsAdmin();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("admin_list_subscribers");
    if (error) toast.error(error.message);
    else setRows((data ?? []) as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  if (!isAdmin) return null;

  const revoke = async (userId: string) => {
    const { error } = await (supabase as any).rpc("admin_revoke_user_access", { _user_id: userId });
    if (error) toast.error(error.message);
    else {
      toast.success("Access removed for that user.");
      void load();
    }
  };

  return (
    <section className="rounded-2xl border border-primary/30 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> Admin — subscribers ({rows.length})
        </h2>
        <button onClick={() => void load()} className="p-2 rounded-lg hover:bg-muted" aria-label="Refresh">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </button>
      </div>

      {rows.length === 0 && !loading && (
        <p className="text-xs text-muted-foreground">No purchases yet.</p>
      )}

      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.user_id} className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{r.display_name || "Unnamed"}</span>
              <span className="text-muted-foreground">₹{(r.total_paise / 100).toFixed(0)}</span>
            </div>
            <div className="text-muted-foreground break-all">{r.email ?? "no email"}</div>

            <div className="flex flex-wrap gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
                  r.notes_active ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"
                }`}
              >
                <BookOpen className="h-3 w-3" /> {notesLabel(r.notes_plans)} {r.notes_active ? "unlocked" : "locked"}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
                  r.adfree_active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                <BadgeCheck className="h-3 w-3" /> Ad-free {r.adfree_active ? "unlocked" : "expired"}
              </span>
            </div>

            <div className="text-muted-foreground">
              Bought {new Date(r.first_purchase).toLocaleDateString()}
              {r.adfree_expires_at && ` · ad-free till ${new Date(r.adfree_expires_at).toLocaleDateString()}`}
            </div>
            {r.payment_ids && <div className="text-muted-foreground break-all">{r.payment_ids}</div>}

            {(r.notes_active || r.adfree_active) && (
              <button
                onClick={() => void revoke(r.user_id)}
                className="mt-1 inline-flex items-center gap-1 rounded-lg border border-destructive/50 px-2 py-1 font-semibold text-destructive"
              >
                <Trash2 className="h-3 w-3" /> Remove all access
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
