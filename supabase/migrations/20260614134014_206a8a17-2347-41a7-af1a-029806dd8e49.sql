
CREATE OR REPLACE FUNCTION public.reconcile_question_progress(_question_ids text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _week_start date := date_trunc('week', (now() AT TIME ZONE 'UTC'))::date;
  _total int;
  _weekly int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Delete server rows not in client list
  DELETE FROM public.question_progress
   WHERE user_id = _uid
     AND question_id <> ALL (COALESCE(_question_ids, ARRAY[]::text[]));

  -- Insert missing rows
  IF _question_ids IS NOT NULL AND array_length(_question_ids, 1) > 0 THEN
    INSERT INTO public.question_progress (user_id, question_id, completed_at)
    SELECT _uid, qid, now()
      FROM unnest(_question_ids) AS qid
    ON CONFLICT (user_id, question_id) DO NOTHING;
  END IF;

  SELECT COUNT(*) INTO _total
    FROM public.question_progress WHERE user_id = _uid;

  SELECT COUNT(*) INTO _weekly
    FROM public.question_progress
   WHERE user_id = _uid
     AND completed_at >= _week_start;

  UPDATE public.profiles
     SET xp = _total,
         weekly_xp = _weekly,
         updated_at = now()
   WHERE user_id = _uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconcile_question_progress(text[]) TO authenticated;
