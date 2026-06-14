
CREATE OR REPLACE FUNCTION public.record_questions_done(_question_ids text[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    UPDATE public.profiles SET xp = xp + _added WHERE id = _uid;

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
$$;

GRANT EXECUTE ON FUNCTION public.record_questions_done(text[]) TO authenticated;
