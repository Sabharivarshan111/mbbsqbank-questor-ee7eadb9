
-- Drop old register_open before re-creating with new return shape
DROP FUNCTION IF EXISTS public.register_open();

-- 1. Revision schedule
CREATE TABLE IF NOT EXISTS public.revision_schedule (
  user_id UUID NOT NULL,
  question_id TEXT NOT NULL,
  year public.app_year NOT NULL,
  ease REAL NOT NULL DEFAULT 2.5,
  interval_days INT NOT NULL DEFAULT 1,
  due_date DATE NOT NULL DEFAULT (public.app_today() + 1),
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revision_schedule TO authenticated;
GRANT ALL ON public.revision_schedule TO service_role;
ALTER TABLE public.revision_schedule ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rs_own" ON public.revision_schedule;
CREATE POLICY "rs_own" ON public.revision_schedule FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_rs_due ON public.revision_schedule(user_id, due_date);
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.revision_schedule;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Exam targets
CREATE TABLE IF NOT EXISTS public.exam_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  year public.app_year NOT NULL,
  subject TEXT,
  exam_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS et_uniq ON public.exam_targets(user_id, year, COALESCE(subject, ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_targets TO authenticated;
GRANT ALL ON public.exam_targets TO service_role;
ALTER TABLE public.exam_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "et_own" ON public.exam_targets;
CREATE POLICY "et_own" ON public.exam_targets FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS et_touch ON public.exam_targets;
CREATE TRIGGER et_touch BEFORE UPDATE ON public.exam_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_targets;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Streak freeze columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS streak_freezes_available INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_freezes_granted_week DATE;

-- 4. record_question_done with revision schedule
CREATE OR REPLACE FUNCTION public.record_question_done(_question_id text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _year public.app_year;
  _inserted BOOLEAN := false;
  _week_start DATE;
  _today DATE := public.app_today();
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  SELECT year INTO _year FROM public.profiles WHERE id = _uid;
  IF _year IS NULL THEN RETURN; END IF;
  INSERT INTO public.question_progress(user_id, question_id, year)
  VALUES (_uid, _question_id, _year) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS _inserted = ROW_COUNT;
  IF _inserted THEN
    UPDATE public.profiles SET xp = (SELECT COUNT(*)::int FROM public.question_progress WHERE user_id = _uid) WHERE id = _uid;
    INSERT INTO public.daily_activity(user_id, date, opens, questions_done, year)
    VALUES (_uid, _today, 0, 1, _year)
    ON CONFLICT (user_id, date) DO UPDATE
      SET questions_done = public.daily_activity.questions_done + 1,
          year = COALESCE(public.daily_activity.year, EXCLUDED.year);
    _week_start := public.app_week_start();
    INSERT INTO public.weekly_xp(user_id, week_start, year, xp, updated_at)
    VALUES (_uid, _week_start, _year, 1, now())
    ON CONFLICT (user_id, week_start, year) DO UPDATE
      SET xp = public.weekly_xp.xp + 1, updated_at = now();
    INSERT INTO public.revision_schedule(user_id, question_id, year, due_date)
    VALUES (_uid, _question_id, _year, _today + 1)
    ON CONFLICT (user_id, question_id) DO NOTHING;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_questions_done(_question_ids text[])
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _year public.app_year;
  _added INTEGER := 0;
  _week_start DATE;
  _today DATE := public.app_today();
BEGIN
  IF _uid IS NULL OR _question_ids IS NULL OR array_length(_question_ids, 1) IS NULL THEN RETURN 0; END IF;
  SELECT year INTO _year FROM public.profiles WHERE id = _uid;
  IF _year IS NULL THEN RETURN 0; END IF;
  WITH ins AS (
    INSERT INTO public.question_progress(user_id, question_id, year)
    SELECT _uid, qid, _year FROM unnest(_question_ids) AS qid
    ON CONFLICT DO NOTHING RETURNING question_id
  ) SELECT COUNT(*)::int INTO _added FROM ins;
  IF _added > 0 THEN
    UPDATE public.profiles SET xp = (SELECT COUNT(*)::int FROM public.question_progress WHERE user_id = _uid) WHERE id = _uid;
    INSERT INTO public.daily_activity(user_id, date, opens, questions_done, year)
    VALUES (_uid, _today, 0, _added, _year)
    ON CONFLICT (user_id, date) DO UPDATE
      SET questions_done = public.daily_activity.questions_done + _added,
          year = COALESCE(public.daily_activity.year, EXCLUDED.year);
    _week_start := public.app_week_start();
    INSERT INTO public.weekly_xp(user_id, week_start, year, xp, updated_at)
    VALUES (_uid, _week_start, _year, _added, now())
    ON CONFLICT (user_id, week_start, year) DO UPDATE
      SET xp = public.weekly_xp.xp + _added, updated_at = now();
    INSERT INTO public.revision_schedule(user_id, question_id, year, due_date)
    SELECT _uid, qid, _year, _today + 1 FROM unnest(_question_ids) AS qid
    ON CONFLICT (user_id, question_id) DO NOTHING;
  END IF;
  RETURN _added;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_question_undone(_question_id text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
  SELECT completed_at, year INTO _completed_at, _year FROM public.question_progress
    WHERE user_id = _uid AND question_id = _question_id;
  IF _completed_at IS NULL THEN RETURN; END IF;
  DELETE FROM public.question_progress WHERE user_id = _uid AND question_id = _question_id;
  GET DIAGNOSTICS _deleted = ROW_COUNT;
  IF _deleted > 0 THEN
    UPDATE public.profiles SET xp = (SELECT COUNT(*)::int FROM public.question_progress WHERE user_id = _uid) WHERE id = _uid;
    _date := (_completed_at at time zone 'Asia/Kolkata')::date;
    UPDATE public.daily_activity SET questions_done = GREATEST(questions_done - 1, 0)
      WHERE user_id = _uid AND date = _date;
    _week_start := (date_trunc('week', (_completed_at at time zone 'Asia/Kolkata')))::date;
    UPDATE public.weekly_xp SET xp = GREATEST(xp - 1, 0), updated_at = now()
      WHERE user_id = _uid AND week_start = _week_start AND year = _year;
    DELETE FROM public.revision_schedule WHERE user_id = _uid AND question_id = _question_id;
  END IF;
END;
$function$;

-- 5. register_open with freeze
CREATE OR REPLACE FUNCTION public.register_open()
 RETURNS TABLE(streak integer, last_active_date date, freeze_used boolean, freezes_available integer)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _last DATE; _streak INTEGER; _gap INTEGER;
  _year public.app_year;
  _today DATE := public.app_today();
  _wk DATE := public.app_week_start();
  _freezes INT; _granted_wk DATE;
  _used BOOLEAN := false;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  SELECT p.last_active_date, p.streak, p.year, p.streak_freezes_available, p.streak_freezes_granted_week
    INTO _last, _streak, _year, _freezes, _granted_wk
    FROM public.profiles p WHERE p.id = _uid;
  IF _granted_wk IS NULL OR _granted_wk < _wk THEN
    _freezes := LEAST(COALESCE(_freezes, 0) + 1, 2);
    _granted_wk := _wk;
  END IF;
  IF _last IS NULL THEN
    _streak := 1;
  ELSE
    _gap := _today - _last;
    IF _gap > 1 THEN
      IF _gap = 2 AND COALESCE(_freezes, 0) > 0 THEN
        _freezes := _freezes - 1;
        _streak := COALESCE(_streak, 0) + 1;
        _used := true;
      ELSE
        _streak := 1;
      END IF;
    ELSIF _gap = 1 THEN
      _streak := COALESCE(_streak, 0) + 1;
    ELSE
      _streak := GREATEST(COALESCE(_streak, 0), 1);
    END IF;
  END IF;
  UPDATE public.profiles
     SET streak = _streak, last_active_date = _today,
         streak_freezes_available = COALESCE(_freezes, 0),
         streak_freezes_granted_week = _granted_wk
   WHERE id = _uid;
  INSERT INTO public.daily_activity(user_id, date, opens, year)
  VALUES (_uid, _today, 1, _year)
  ON CONFLICT (user_id, date) DO UPDATE
    SET opens = public.daily_activity.opens + 1,
        year  = COALESCE(public.daily_activity.year, EXCLUDED.year);
  RETURN QUERY SELECT _streak, _today, _used, COALESCE(_freezes, 0);
END;
$function$;

-- 6. review_question (SM-2 lite)
CREATE OR REPLACE FUNCTION public.review_question(_question_id text, _grade text)
 RETURNS TABLE(next_due date, new_interval int, new_ease real)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _year public.app_year;
  _ease REAL; _interval INT;
  _today DATE := public.app_today();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _grade NOT IN ('again','hard','good','easy') THEN RAISE EXCEPTION 'bad grade'; END IF;
  SELECT year INTO _year FROM public.profiles WHERE id = _uid;
  SELECT ease, interval_days INTO _ease, _interval FROM public.revision_schedule
    WHERE user_id = _uid AND question_id = _question_id;
  IF _ease IS NULL THEN _ease := 2.5; _interval := 1; END IF;
  IF _grade = 'again' THEN
    _interval := 1; _ease := GREATEST(_ease - 0.2, 1.3);
  ELSIF _grade = 'hard' THEN
    _interval := GREATEST(CEIL(_interval * 1.2)::int, _interval + 1);
    _ease := GREATEST(_ease - 0.15, 1.3);
  ELSIF _grade = 'good' THEN
    _interval := GREATEST(CEIL(_interval * _ease)::int, _interval + 1);
  ELSE
    _interval := GREATEST(CEIL(_interval * _ease * 1.3)::int, _interval + 2);
    _ease := _ease + 0.15;
  END IF;
  INSERT INTO public.revision_schedule(user_id, question_id, year, ease, interval_days, due_date, last_reviewed_at)
  VALUES (_uid, _question_id, _year, _ease, _interval, _today + _interval, now())
  ON CONFLICT (user_id, question_id) DO UPDATE
    SET ease = EXCLUDED.ease, interval_days = EXCLUDED.interval_days,
        due_date = EXCLUDED.due_date, last_reviewed_at = now();
  RETURN QUERY SELECT (_today + _interval)::date, _interval, _ease;
END;
$function$;

-- 7. award_quiz_xp
CREATE OR REPLACE FUNCTION public.award_quiz_xp(_amount integer)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _year public.app_year;
  _wk DATE := public.app_week_start();
  _today DATE := public.app_today();
BEGIN
  IF _uid IS NULL OR _amount IS NULL OR _amount <= 0 THEN RETURN; END IF;
  SELECT year INTO _year FROM public.profiles WHERE id = _uid;
  IF _year IS NULL THEN RETURN; END IF;
  INSERT INTO public.weekly_xp(user_id, week_start, year, xp, updated_at)
  VALUES (_uid, _wk, _year, _amount, now())
  ON CONFLICT (user_id, week_start, year) DO UPDATE
    SET xp = public.weekly_xp.xp + _amount, updated_at = now();
  INSERT INTO public.daily_activity(user_id, date, opens, questions_done, year)
  VALUES (_uid, _today, 0, 0, _year)
  ON CONFLICT (user_id, date) DO NOTHING;
END;
$function$;

-- 8. merge_into_current_user extended
CREATE OR REPLACE FUNCTION public.merge_into_current_user(_old_user_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _old_user_id IS NULL OR _old_user_id = _uid THEN RETURN; END IF;

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
END;
$function$;
