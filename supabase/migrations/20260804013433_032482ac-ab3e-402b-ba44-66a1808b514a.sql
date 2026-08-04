-- 1) Lock down profiles SELECT
DROP POLICY IF EXISTS "Profiles readable by any authenticated user" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

-- 2) Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
$$;

-- Auto-grant admin to the owner's verified Google email
CREATE OR REPLACE FUNCTION public.grant_admin_for_owner_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND lower(NEW.email) = 'sabharivarshan111@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_admin
AFTER INSERT ON auth.users FOR EACH ROW
EXECUTE FUNCTION public.grant_admin_for_owner_email();

DROP TRIGGER IF EXISTS on_auth_user_confirmed_grant_admin ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_grant_admin
AFTER UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_admin_for_owner_email();

-- Backfill if that user already exists and is verified
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users
WHERE lower(email) = 'sabharivarshan111@gmail.com' AND email_confirmed_at IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 3) Admin access to subscriptions
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.premium_subscriptions;
CREATE POLICY "Admins can view all subscriptions" ON public.premium_subscriptions
  FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "Admins can delete subscriptions" ON public.premium_subscriptions;
CREATE POLICY "Admins can delete subscriptions" ON public.premium_subscriptions
  FOR DELETE TO authenticated USING (public.is_admin());
GRANT SELECT, DELETE ON public.premium_subscriptions TO authenticated;
GRANT ALL ON public.premium_subscriptions TO service_role;

-- Admin listing helper (joins display_name without exposing profiles broadly)
CREATE OR REPLACE FUNCTION public.admin_list_subscriptions()
RETURNS TABLE(id uuid, user_id uuid, display_name text, email text, plan text,
              amount_paise integer, razorpay_payment_id text, starts_at timestamptz,
              expires_at timestamptz, active boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.user_id, p.display_name, COALESCE(s.email, p.email), s.plan,
         s.amount_paise, s.razorpay_payment_id, s.starts_at, s.expires_at,
         (s.expires_at > now()) AS active
    FROM public.premium_subscriptions s
    LEFT JOIN public.profiles p ON p.id = s.user_id
   WHERE public.is_admin()
   ORDER BY s.created_at DESC
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_subscription(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.premium_subscriptions SET expires_at = now(), updated_at = now() WHERE id = _id;
END; $$;

-- 4) Harden merge RPCs
CREATE OR REPLACE FUNCTION public.merge_into_current_user(_old_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _my_device text;
  _old_device text;
  _old_is_anon boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _old_user_id IS NULL OR _old_user_id = _uid THEN RETURN; END IF;

  SELECT device_id INTO _my_device FROM public.profiles WHERE id = _uid;
  SELECT device_id INTO _old_device FROM public.profiles WHERE id = _old_user_id;
  SELECT COALESCE((u.raw_app_meta_data->>'provider') IS NULL OR u.email IS NULL, true)
    INTO _old_is_anon FROM auth.users u WHERE u.id = _old_user_id;

  -- Only absorb a not-yet-signed-in (anonymous) account from the SAME device.
  IF _my_device IS NULL OR _old_device IS NULL OR _my_device <> _old_device THEN
    RAISE EXCEPTION 'Not authorized to merge this account';
  END IF;
  IF NOT COALESCE(_old_is_anon, false) THEN
    RAISE EXCEPTION 'Not authorized to merge this account';
  END IF;

  INSERT INTO public.question_progress(user_id, question_id, completed_at, year)
  SELECT _uid, question_id, completed_at, year FROM public.question_progress WHERE user_id = _old_user_id
  ON CONFLICT (user_id, question_id) DO NOTHING;
  DELETE FROM public.question_progress WHERE user_id = _old_user_id;

  INSERT INTO public.weekly_xp(user_id, week_start, year, xp, updated_at)
  SELECT _uid, week_start, year, xp, updated_at FROM public.weekly_xp WHERE user_id = _old_user_id
  ON CONFLICT (user_id, week_start, year) DO UPDATE
    SET xp = public.weekly_xp.xp + EXCLUDED.xp, updated_at = now();
  DELETE FROM public.weekly_xp WHERE user_id = _old_user_id;

  INSERT INTO public.daily_activity(user_id, date, opens, questions_done, year)
  SELECT _uid, date, opens, questions_done, year FROM public.daily_activity WHERE user_id = _old_user_id
  ON CONFLICT (user_id, date) DO UPDATE
    SET opens = public.daily_activity.opens + EXCLUDED.opens,
        questions_done = public.daily_activity.questions_done + EXCLUDED.questions_done,
        year = COALESCE(public.daily_activity.year, EXCLUDED.year);
  DELETE FROM public.daily_activity WHERE user_id = _old_user_id;

  INSERT INTO public.screen_time(user_id, year, seconds, weekly_seconds, week_start, updated_at)
  SELECT _uid, year, seconds, weekly_seconds, week_start, updated_at FROM public.screen_time WHERE user_id = _old_user_id
  ON CONFLICT (user_id, year) DO UPDATE
    SET seconds = public.screen_time.seconds + EXCLUDED.seconds,
        weekly_seconds = public.screen_time.weekly_seconds + EXCLUDED.weekly_seconds,
        week_start = GREATEST(public.screen_time.week_start, EXCLUDED.week_start),
        updated_at = now();
  DELETE FROM public.screen_time WHERE user_id = _old_user_id;

  INSERT INTO public.revision_schedule(user_id, question_id, year, ease, interval_days, due_date, last_reviewed_at, created_at)
  SELECT _uid, question_id, year, ease, interval_days, due_date, last_reviewed_at, created_at
    FROM public.revision_schedule WHERE user_id = _old_user_id
  ON CONFLICT (user_id, question_id) DO NOTHING;
  DELETE FROM public.revision_schedule WHERE user_id = _old_user_id;

  INSERT INTO public.exam_targets(user_id, year, subject, exam_date, created_at, updated_at)
  SELECT _uid, year, subject, exam_date, created_at, updated_at
    FROM public.exam_targets WHERE user_id = _old_user_id;
  DELETE FROM public.exam_targets WHERE user_id = _old_user_id;

  UPDATE public.calendar_events SET user_id = _uid WHERE user_id = _old_user_id;
  UPDATE public.user_notes SET user_id = _uid WHERE user_id = _old_user_id;

  UPDATE public.profiles cur
     SET streak = GREATEST(cur.streak, old.streak),
         last_active_date = GREATEST(cur.last_active_date, old.last_active_date),
         streak_freezes_available = GREATEST(cur.streak_freezes_available, old.streak_freezes_available)
    FROM public.profiles old WHERE cur.id = _uid AND old.id = _old_user_id;

  DELETE FROM public.profiles WHERE id = _old_user_id;
  UPDATE public.profiles SET xp = (SELECT COUNT(*)::int FROM public.question_progress WHERE user_id = _uid) WHERE id = _uid;
END; $$;

CREATE OR REPLACE FUNCTION public.claim_or_merge_profile(_device_id text, _display_name text, _year app_year)
RETURNS profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _old_uid UUID;
  _result public.profiles;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Upsert current profile first (records this device against the caller)
  INSERT INTO public.profiles(id, display_name, year, device_id)
  VALUES (_uid, _display_name, _year, _device_id)
  ON CONFLICT (id) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        year         = EXCLUDED.year,
        device_id    = COALESCE(EXCLUDED.device_id, public.profiles.device_id);

  -- Only absorb an ANONYMOUS profile from the same device
  IF _device_id IS NOT NULL AND length(_device_id) > 0 THEN
    SELECT p.id INTO _old_uid
      FROM public.profiles p
      JOIN auth.users u ON u.id = p.id
     WHERE p.device_id = _device_id
       AND p.id <> _uid
       AND (u.email IS NULL OR u.email_confirmed_at IS NULL)
     ORDER BY p.xp DESC, p.created_at ASC
     LIMIT 1;

    IF _old_uid IS NOT NULL THEN
      PERFORM public.merge_into_current_user(_old_uid);
    END IF;
  END IF;

  UPDATE public.profiles
     SET xp = (SELECT COUNT(*)::int FROM public.question_progress WHERE user_id = _uid)
   WHERE id = _uid;

  SELECT * INTO _result FROM public.profiles WHERE id = _uid;
  RETURN _result;
END; $$;