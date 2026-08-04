import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** True only when the signed-in user has the 'admin' role in user_roles. */
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsAdmin(false); return; }
      const { data } = await (supabase as any).rpc("is_admin");
      setIsAdmin(data === true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { void check(); });
    return () => sub.subscription.unsubscribe();
  }, [check]);

  return { isAdmin, loading };
}
