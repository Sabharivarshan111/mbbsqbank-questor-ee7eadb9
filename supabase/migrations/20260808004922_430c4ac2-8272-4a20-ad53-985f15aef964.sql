CREATE OR REPLACE FUNCTION public.admin_list_subscribers()
RETURNS TABLE(
  user_id uuid,
  display_name text,
  email text,
  notes_id uuid,
  adfree_id uuid,
  notes_active boolean,
  adfree_active boolean,
  notes_expires_at timestamptz,
  adfree_expires_at timestamptz,
  total_paise integer,
  payment_ids text,
  first_purchase timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH agg AS (
    SELECT s.user_id,
           MAX(COALESCE(NULLIF(s.email,''), NULL)) AS email,
           MAX(CASE WHEN s.plan='notes_fmspm' THEN s.id::text END)::uuid AS notes_id,
           MAX(CASE WHEN s.plan='adfree_monthly' THEN s.id::text END)::uuid AS adfree_id,
           MAX(CASE WHEN s.plan='notes_fmspm' THEN s.expires_at END) AS notes_expires_at,
           MAX(CASE WHEN s.plan='adfree_monthly' THEN s.expires_at END) AS adfree_expires_at,
           SUM(s.amount_paise)::int AS total_paise,
           string_agg(DISTINCT split_part(COALESCE(s.razorpay_payment_id,''), ':', 1), ', ')
             FILTER (WHERE COALESCE(s.razorpay_payment_id,'') <> '') AS payment_ids,
           MIN(s.created_at) AS first_purchase
      FROM public.premium_subscriptions s
     GROUP BY s.user_id
  )
  SELECT a.user_id,
         COALESCE(NULLIF(p.display_name,''),
                  NULLIF(u.raw_user_meta_data->>'full_name',''),
                  NULLIF(u.raw_user_meta_data->>'name',''),
                  split_part(COALESCE(a.email, u.email, ''), '@', 1)) AS display_name,
         COALESCE(a.email, u.email) AS email,
         a.notes_id, a.adfree_id,
         (a.notes_expires_at > now()) AS notes_active,
         (a.adfree_expires_at > now()) AS adfree_active,
         a.notes_expires_at, a.adfree_expires_at,
         a.total_paise, a.payment_ids, a.first_purchase
    FROM agg a
    LEFT JOIN public.profiles p ON p.id = a.user_id
    LEFT JOIN auth.users u ON u.id = a.user_id
   WHERE public.is_admin()
   ORDER BY a.first_purchase DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_user_access(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.premium_subscriptions SET expires_at = now(), updated_at = now()
   WHERE user_id = _user_id AND expires_at > now();
END; $$;

-- Complimentary lifetime notes access for every ad-free purchaser missing it
INSERT INTO public.premium_subscriptions (user_id, email, plan, amount_paise, razorpay_order_id, razorpay_payment_id, starts_at, expires_at)
SELECT s.user_id, s.email, 'notes_fmspm', 0, s.razorpay_order_id,
       COALESCE(s.razorpay_payment_id, s.id::text) || ':notes-comp', now(), now() + interval '100 years'
  FROM public.premium_subscriptions s
 WHERE s.plan = 'adfree_monthly'
   AND NOT EXISTS (
     SELECT 1 FROM public.premium_subscriptions n
      WHERE n.user_id = s.user_id AND n.plan = 'notes_fmspm' AND n.expires_at > now()
   );