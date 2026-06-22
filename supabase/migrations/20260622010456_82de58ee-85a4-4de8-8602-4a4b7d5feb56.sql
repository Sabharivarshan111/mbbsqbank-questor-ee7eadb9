DROP FUNCTION IF EXISTS public.reconcile_question_progress(text[]);

CREATE FUNCTION public.reconcile_question_progress(_question_ids text[])
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _year public.app_year;
  _added int := 0;
  _today date := public.app_today();
  _week_start date := public.app_week_start();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT year INTO _year FROM public.profiles WHERE id = _uid;

  IF _question_ids IS NOT NULL AND array_length(_question_ids, 1) > 0 AND _year IS NOT NULL THEN
    WITH ins AS (
      INSERT INTO public.question_progress (user_id, question_id, year)
      SELECT _uid, qid, _year FROM unnest(_question_ids) AS qid
      ON CONFLICT (user_id, question_id) DO NOTHING
      RETURNING 1
    )
    SELECT COUNT(*)::int INTO _added FROM ins;

    IF _added > 0 THEN
      INSERT INTO public.daily_activity(user_id, date, opens, questions_done, year)
      VALUES (_uid, _today, 0, _added, _year)
      ON CONFLICT (user_id, date) DO UPDATE
        SET questions_done = public.daily_activity.questions_done + _added,
            year = COALESCE(public.daily_activity.year, EXCLUDED.year);

      INSERT INTO public.weekly_xp(user_id, week_start, year, xp, updated_at)
      VALUES (_uid, _week_start, _year, _added, now())
      ON CONFLICT (user_id, week_start, year) DO UPDATE
        SET xp = public.weekly_xp.xp + _added, updated_at = now();
    END IF;
  END IF;

  UPDATE public.profiles
     SET xp = (SELECT COUNT(*)::int FROM public.question_progress WHERE user_id = _uid),
         updated_at = now()
   WHERE id = _uid;

  RETURN QUERY
    SELECT question_id FROM public.question_progress WHERE user_id = _uid;
END;
$function$;