CREATE OR REPLACE FUNCTION public.record_question_done(_question_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _year public.app_year;
  _inserted BOOLEAN := false;
  _week_start DATE;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;

  SELECT year INTO _year FROM public.profiles WHERE id = _uid;
  IF _year IS NULL THEN RETURN; END IF;

  INSERT INTO public.question_progress(user_id, question_id, year)
  VALUES (_uid, _question_id, _year)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS _inserted = ROW_COUNT;

  IF _inserted THEN
    UPDATE public.profiles
       SET xp = (SELECT COUNT(*)::int FROM public.question_progress WHERE user_id = _uid)
     WHERE id = _uid;

    INSERT INTO public.daily_activity(user_id, date, opens, questions_done, year)
    VALUES (_uid, CURRENT_DATE, 0, 1, _year)
    ON CONFLICT (user_id, date) DO UPDATE
      SET questions_done = public.daily_activity.questions_done + 1,
          year = COALESCE(public.daily_activity.year, EXCLUDED.year);

    _week_start := (date_trunc('week', CURRENT_DATE))::date;
    INSERT INTO public.weekly_xp(user_id, week_start, year, xp, updated_at)
    VALUES (_uid, _week_start, _year, 1, now())
    ON CONFLICT (user_id, week_start, year) DO UPDATE
      SET xp = public.weekly_xp.xp + 1, updated_at = now();
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_questions_done(_question_ids text[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _year public.app_year;
  _added INTEGER := 0;
  _week_start DATE;
BEGIN
  IF _uid IS NULL OR _question_ids IS NULL OR array_length(_question_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  SELECT year INTO _year FROM public.profiles WHERE id = _uid;
  IF _year IS NULL THEN RETURN 0; END IF;

  WITH ins AS (
    INSERT INTO public.question_progress(user_id, question_id, year)
    SELECT _uid, qid, _year FROM unnest(_question_ids) AS qid
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*)::int INTO _added FROM ins;

  IF _added > 0 THEN
    UPDATE public.profiles
       SET xp = (SELECT COUNT(*)::int FROM public.question_progress WHERE user_id = _uid)
     WHERE id = _uid;

    INSERT INTO public.daily_activity(user_id, date, opens, questions_done, year)
    VALUES (_uid, CURRENT_DATE, 0, _added, _year)
    ON CONFLICT (user_id, date) DO UPDATE
      SET questions_done = public.daily_activity.questions_done + _added,
          year = COALESCE(public.daily_activity.year, EXCLUDED.year);

    _week_start := (date_trunc('week', CURRENT_DATE))::date;
    INSERT INTO public.weekly_xp(user_id, week_start, year, xp, updated_at)
    VALUES (_uid, _week_start, _year, _added, now())
    ON CONFLICT (user_id, week_start, year) DO UPDATE
      SET xp = public.weekly_xp.xp + _added, updated_at = now();
  END IF;

  RETURN _added;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_question_undone(_question_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _completed_at TIMESTAMPTZ;
  _date DATE;
  _week_start DATE;
  _year public.app_year;
  _deleted INTEGER := 0;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;

  SELECT completed_at, year INTO _completed_at, _year
    FROM public.question_progress
   WHERE user_id = _uid AND question_id = _question_id;

  IF _completed_at IS NULL THEN RETURN; END IF;

  DELETE FROM public.question_progress
   WHERE user_id = _uid AND question_id = _question_id;
  GET DIAGNOSTICS _deleted = ROW_COUNT;

  IF _deleted > 0 THEN
    UPDATE public.profiles
       SET xp = (SELECT COUNT(*)::int FROM public.question_progress WHERE user_id = _uid)
     WHERE id = _uid;

    _date := _completed_at::date;
    UPDATE public.daily_activity
       SET questions_done = GREATEST(questions_done - 1, 0)
     WHERE user_id = _uid AND date = _date;

    _week_start := (date_trunc('week', _completed_at))::date;
    UPDATE public.weekly_xp
       SET xp = GREATEST(xp - 1, 0), updated_at = now()
     WHERE user_id = _uid AND week_start = _week_start AND year = _year;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.record_question_done(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_questions_done(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_question_undone(text) TO authenticated;