
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

CREATE OR REPLACE FUNCTION public.merge_into_current_user(_old_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _old_user_id IS NULL OR _old_user_id = _uid THEN RETURN; END IF;

  INSERT INTO public.question_progress(user_id, question_id, completed_at, year)
  SELECT _uid, question_id, completed_at, year
    FROM public.question_progress WHERE user_id = _old_user_id
  ON CONFLICT (user_id, question_id) DO NOTHING;
  DELETE FROM public.question_progress WHERE user_id = _old_user_id;

  INSERT INTO public.weekly_xp(user_id, week_start, year, xp, updated_at)
  SELECT _uid, week_start, year, xp, updated_at FROM public.weekly_xp
   WHERE user_id = _old_user_id
  ON CONFLICT (user_id, week_start, year) DO UPDATE
    SET xp = public.weekly_xp.xp + EXCLUDED.xp, updated_at = now();
  DELETE FROM public.weekly_xp WHERE user_id = _old_user_id;

  INSERT INTO public.daily_activity(user_id, date, opens, questions_done, year)
  SELECT _uid, date, opens, questions_done, year FROM public.daily_activity
   WHERE user_id = _old_user_id
  ON CONFLICT (user_id, date) DO UPDATE
    SET opens = public.daily_activity.opens + EXCLUDED.opens,
        questions_done = public.daily_activity.questions_done + EXCLUDED.questions_done,
        year = COALESCE(public.daily_activity.year, EXCLUDED.year);
  DELETE FROM public.daily_activity WHERE user_id = _old_user_id;

  INSERT INTO public.screen_time(user_id, year, seconds, weekly_seconds, week_start, updated_at)
  SELECT _uid, year, seconds, weekly_seconds, week_start, updated_at
    FROM public.screen_time WHERE user_id = _old_user_id
  ON CONFLICT (user_id, year) DO UPDATE
    SET seconds = public.screen_time.seconds + EXCLUDED.seconds,
        weekly_seconds = public.screen_time.weekly_seconds + EXCLUDED.weekly_seconds,
        week_start = GREATEST(public.screen_time.week_start, EXCLUDED.week_start),
        updated_at = now();
  DELETE FROM public.screen_time WHERE user_id = _old_user_id;

  UPDATE public.profiles cur
     SET streak = GREATEST(cur.streak, old.streak),
         last_active_date = GREATEST(cur.last_active_date, old.last_active_date)
    FROM public.profiles old
   WHERE cur.id = _uid AND old.id = _old_user_id;

  DELETE FROM public.profiles WHERE id = _old_user_id;

  UPDATE public.profiles
     SET xp = (SELECT COUNT(*)::int FROM public.question_progress WHERE user_id = _uid)
   WHERE id = _uid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.merge_into_current_user(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.merge_into_current_user(uuid) TO authenticated, service_role;
