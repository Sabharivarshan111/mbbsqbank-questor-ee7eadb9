
-- Helper: current week start in Asia/Kolkata
create or replace function public.app_week_start()
returns date language sql stable
set search_path = public as $$
  select (date_trunc('week', (now() at time zone 'Asia/Kolkata')))::date
$$;

create or replace function public.app_today()
returns date language sql stable
set search_path = public as $$
  select ((now() at time zone 'Asia/Kolkata'))::date
$$;

-- get_weekly_leaderboard
CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard(_year text DEFAULT NULL::text, _limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, display_name text, year text, weekly_xp integer, year_xp integer, xp integer, streak integer, weekly_seconds bigint, year_seconds bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH wk AS (
    SELECT user_id, SUM(xp)::int AS weekly_xp
      FROM public.weekly_xp
     WHERE week_start = public.app_week_start()
       AND (_year IS NULL OR year::text = _year)
     GROUP BY user_id
  ),
  yc AS (
    SELECT user_id, COUNT(*)::int AS year_xp
      FROM public.question_progress
     WHERE _year IS NOT NULL AND year::text = _year
     GROUP BY user_id
  )
  SELECT p.id, p.display_name, p.year::text,
         COALESCE(wk.weekly_xp, 0) AS weekly_xp,
         COALESCE(yc.year_xp, 0)   AS year_xp,
         p.xp, p.streak,
         COALESCE(CASE WHEN st.week_start = public.app_week_start() THEN st.weekly_seconds ELSE 0 END, 0)::bigint AS weekly_seconds,
         COALESCE(st.seconds, 0)::bigint AS year_seconds
    FROM public.profiles p
    LEFT JOIN wk ON wk.user_id = p.id
    LEFT JOIN yc ON yc.user_id = p.id
    LEFT JOIN public.screen_time st ON st.user_id = p.id AND (_year IS NULL OR st.year::text = _year)
   WHERE (_year IS NULL OR p.year::text = _year)
   ORDER BY COALESCE(wk.weekly_xp, 0) DESC,
            p.streak DESC,
            COALESCE(CASE WHEN st.week_start = public.app_week_start() THEN st.weekly_seconds ELSE 0 END, 0) DESC,
            p.display_name ASC
   LIMIT _limit;
$function$;

-- record_question_done
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
  _today DATE := public.app_today();
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
    VALUES (_uid, _today, 0, 1, _year)
    ON CONFLICT (user_id, date) DO UPDATE
      SET questions_done = public.daily_activity.questions_done + 1,
          year = COALESCE(public.daily_activity.year, EXCLUDED.year);

    _week_start := public.app_week_start();
    INSERT INTO public.weekly_xp(user_id, week_start, year, xp, updated_at)
    VALUES (_uid, _week_start, _year, 1, now())
    ON CONFLICT (user_id, week_start, year) DO UPDATE
      SET xp = public.weekly_xp.xp + 1, updated_at = now();
  END IF;
END;
$function$;

-- record_questions_done
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
  _today DATE := public.app_today();
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
    VALUES (_uid, _today, 0, _added, _year)
    ON CONFLICT (user_id, date) DO UPDATE
      SET questions_done = public.daily_activity.questions_done + _added,
          year = COALESCE(public.daily_activity.year, EXCLUDED.year);

    _week_start := public.app_week_start();
    INSERT INTO public.weekly_xp(user_id, week_start, year, xp, updated_at)
    VALUES (_uid, _week_start, _year, _added, now())
    ON CONFLICT (user_id, week_start, year) DO UPDATE
      SET xp = public.weekly_xp.xp + _added, updated_at = now();
  END IF;

  RETURN _added;
END;
$function$;

-- record_question_undone
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

    _date := (_completed_at at time zone 'Asia/Kolkata')::date;
    UPDATE public.daily_activity
       SET questions_done = GREATEST(questions_done - 1, 0)
     WHERE user_id = _uid AND date = _date;

    _week_start := (date_trunc('week', (_completed_at at time zone 'Asia/Kolkata')))::date;
    UPDATE public.weekly_xp
       SET xp = GREATEST(xp - 1, 0), updated_at = now()
     WHERE user_id = _uid AND week_start = _week_start AND year = _year;
  END IF;
END;
$function$;

-- record_screen_time
CREATE OR REPLACE FUNCTION public.record_screen_time(_seconds integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _year public.app_year;
  _wk DATE := public.app_week_start();
BEGIN
  IF _uid IS NULL OR _seconds IS NULL OR _seconds <= 0 THEN RETURN; END IF;
  SELECT year INTO _year FROM public.profiles WHERE id = _uid;
  IF _year IS NULL THEN RETURN; END IF;

  INSERT INTO public.screen_time(user_id, year, seconds, weekly_seconds, week_start, updated_at)
  VALUES (_uid, _year, _seconds, _seconds, _wk, now())
  ON CONFLICT (user_id, year) DO UPDATE
    SET seconds = public.screen_time.seconds + EXCLUDED.seconds,
        weekly_seconds = CASE
          WHEN public.screen_time.week_start = _wk
            THEN public.screen_time.weekly_seconds + EXCLUDED.seconds
          ELSE EXCLUDED.seconds
        END,
        week_start = _wk,
        updated_at = now();
END;
$function$;

-- reconcile_question_progress
CREATE OR REPLACE FUNCTION public.reconcile_question_progress(_question_ids text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _week_start date := public.app_week_start();
  _total int;
  _weekly int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  DELETE FROM public.question_progress
   WHERE user_id = _uid
     AND question_id <> ALL (COALESCE(_question_ids, ARRAY[]::text[]));

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
     AND (completed_at at time zone 'Asia/Kolkata')::date >= _week_start;

  UPDATE public.profiles
     SET xp = _total,
         weekly_xp = _weekly,
         updated_at = now()
   WHERE user_id = _uid;
END;
$function$;

-- register_open: use IST date for streak rollover
CREATE OR REPLACE FUNCTION public.register_open()
 RETURNS TABLE(streak integer, last_active_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _last DATE;
  _streak INTEGER;
  _gap INTEGER;
  _year public.app_year;
  _today DATE := public.app_today();
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;

  SELECT p.last_active_date, p.streak, p.year INTO _last, _streak, _year
    FROM public.profiles p WHERE p.id = _uid;

  IF _last IS NULL THEN
    _streak := 1;
  ELSE
    _gap := _today - _last;
    IF _gap > 1 THEN
      _streak := 1;
    ELSIF _gap = 1 THEN
      _streak := COALESCE(_streak, 0) + 1;
    ELSE
      _streak := GREATEST(COALESCE(_streak, 0), 1);
    END IF;
  END IF;

  UPDATE public.profiles
     SET streak = _streak, last_active_date = _today
   WHERE id = _uid;

  INSERT INTO public.daily_activity(user_id, date, opens, year)
  VALUES (_uid, _today, 1, _year)
  ON CONFLICT (user_id, date) DO UPDATE
    SET opens = public.daily_activity.opens + 1,
        year  = COALESCE(public.daily_activity.year, EXCLUDED.year);

  RETURN QUERY SELECT _streak, _today;
END;
$function$;
