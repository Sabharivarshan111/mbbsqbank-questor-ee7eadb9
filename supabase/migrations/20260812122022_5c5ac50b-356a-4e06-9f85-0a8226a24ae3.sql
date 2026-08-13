DROP FUNCTION IF EXISTS public.admin_list_subscribers();

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
  notes_plans text,
  total_paise integer,
  payment_ids text,
  first_purchase timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH agg AS (
    SELECT s.user_id,
           MAX(CASE WHEN s.plan LIKE 'notes_%' THEN s.id::text END)::uuid AS notes_id,
           MAX(CASE WHEN s.plan = 'adfree_monthly' THEN s.id::text END)::uuid AS adfree_id,
           MAX(CASE WHEN s.plan LIKE 'notes_%' THEN s.expires_at END) AS notes_expires_at,
           MAX(CASE WHEN s.plan = 'adfree_monthly' THEN s.expires_at END) AS adfree_expires_at,
           string_agg(DISTINCT CASE WHEN s.plan LIKE 'notes_%' THEN s.plan END, ', ') AS notes_plans,
           SUM(s.amount_paise)::int AS total_paise,
           string_agg(DISTINCT s.razorpay_payment_id, ', ') AS payment_ids,
           MIN(s.created_at) AS first_purchase,
           MAX(s.email) AS sub_email
      FROM public.premium_subscriptions s
     GROUP BY s.user_id
  )
  SELECT a.user_id,
         COALESCE(
           NULLIF(p.display_name, ''),
           NULLIF(split_part(COALESCE(a.sub_email, u.email, ''), '@', 1), ''),
           NULLIF(u.raw_user_meta_data->>'full_name', ''),
           NULLIF(u.raw_user_meta_data->>'name', ''),
           'Unknown'
         ) AS display_name,
         COALESCE(a.sub_email, u.email) AS email,
         a.notes_id,
         a.adfree_id,
         (a.notes_expires_at IS NOT NULL AND a.notes_expires_at > now()) AS notes_active,
         (a.adfree_expires_at IS NOT NULL AND a.adfree_expires_at > now()) AS adfree_active,
         a.notes_expires_at,
         a.adfree_expires_at,
         a.notes_plans,
         a.total_paise,
         a.payment_ids,
         a.first_purchase
    FROM agg a
    LEFT JOIN public.profiles p ON p.id = a.user_id
    LEFT JOIN auth.users u ON u.id = a.user_id
   WHERE public.is_admin()
   ORDER BY a.first_purchase DESC;
$$;

REVOKE ALL ON FUNCTION public.admin_list_subscribers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_subscribers() TO authenticated;