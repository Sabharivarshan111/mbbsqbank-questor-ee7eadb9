CREATE OR REPLACE FUNCTION public.record_question_undone(_question_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
       SET xp = GREATEST(xp - 1, 0)
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
$$;

GRANT EXECUTE ON FUNCTION public.record_question_undone(text) TO authenticated;