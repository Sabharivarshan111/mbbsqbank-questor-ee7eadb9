
-- =========================================================
-- 1. Schema: add year columns and device_id
-- =========================================================
ALTER TABLE public.question_progress ADD COLUMN IF NOT EXISTS year public.app_year;
ALTER TABLE public.weekly_xp         ADD COLUMN IF NOT EXISTS year public.app_year;
ALTER TABLE public.daily_activity    ADD COLUMN IF NOT EXISTS year public.app_year;
ALTER TABLE public.profiles          ADD COLUMN IF NOT EXISTS device_id text;

-- Backfill year from profiles.year for legacy rows
UPDATE public.question_progress qp
   SET year = p.year
  FROM public.profiles p
 WHERE qp.user_id = p.id AND qp.year IS NULL;

UPDATE public.weekly_xp w
   SET year = p.year
  FROM public.profiles p
 WHERE w.user_id = p.id AND w.year IS NULL;

UPDATE public.daily_activity d
   SET year = p.year
  FROM public.profiles p
 WHERE d.user_id = p.id AND d.year IS NULL;

-- =========================================================
-- 2. Re-key weekly_xp so (user, week, year) is unique
-- =========================================================
ALTER TABLE public.weekly_xp DROP CONSTRAINT IF EXISTS weekly_xp_pkey;
-- collapse any accidental dupes from backfill before re-keying
WITH ranked AS (
  SELECT ctid,
         ROW_NUMBER() OVER (PARTITION BY user_id, week_start, year ORDER BY xp DESC) AS rn
    FROM public.weekly_xp
)
DELETE FROM public.weekly_xp w USING ranked r WHERE w.ctid = r.ctid AND r.rn > 1;

ALTER TABLE public.weekly_xp
  ALTER COLUMN year SET NOT NULL,
  ADD CONSTRAINT weekly_xp_pkey PRIMARY KEY (user_id, week_start, year);

-- =========================================================
-- 3. Cleanup: merge duplicate profiles (same lowercased name + year)
-- =========================================================
DO $$
DECLARE
  grp RECORD;
  keep_uid UUID;
  dup_uid UUID;
BEGIN
  FOR grp IN
    SELECT lower(trim(display_name)) AS name_key, year, array_agg(id ORDER BY xp DESC, created_at ASC) AS ids
      FROM public.profiles
     GROUP BY 1, 2
     HAVING COUNT(*) > 1
  LOOP
    keep_uid := grp.ids[1];
    FOREACH dup_uid IN ARRAY grp.ids[2:array_length(grp.ids, 1)]
    LOOP
      -- Move question_progress rows (skip ones already owned by keeper)
      INSERT INTO public.question_progress(user_id, question_id, completed_at, year)
      SELECT keep_uid, question_id, completed_at, year FROM public.question_progress
       WHERE user_id = dup_uid
      ON CONFLICT (user_id, question_id) DO NOTHING;
      DELETE FROM public.question_progress WHERE user_id = dup_uid;

      -- Move weekly_xp rows
      INSERT INTO public.weekly_xp(user_id, week_start, year, xp, updated_at)
      SELECT keep_uid, week_start, year, xp, updated_at FROM public.weekly_xp
       WHERE user_id = dup_uid
      ON CONFLICT (user_id, week_start, year) DO UPDATE
        SET xp = public.weekly_xp.xp + EXCLUDED.xp, updated_at = now();
      DELETE FROM public.weekly_xp WHERE user_id = dup_uid;

      -- Move daily_activity rows
      INSERT INTO public.daily_activity(user_id, date, opens, questions_done, year)
      SELECT keep_uid, date, opens, questions_done, year FROM public.daily_activity
       WHERE user_id = dup_uid
      ON CONFLICT (user_id, date) DO UPDATE
        SET opens          = public.daily_activity.opens + EXCLUDED.opens,
            questions_done = public.daily_activity.questions_done + EXCLUDED.questions_done;
      DELETE FROM public.daily_activity WHERE user_id = dup_uid;

      DELETE FROM public.profiles WHERE id = dup_uid;
    END LOOP;

    -- Recompute keeper's xp from authoritative source
    UPDATE public.profiles
       SET xp = (SELECT COUNT(*) FROM public.question_progress WHERE user_id = keep_uid)
     WHERE id = keep_uid;
  END LOOP;
END $$;

-- =========================================================
-- 4. Updated record_question_done: stamp year automatically
-- =========================================================
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
    UPDATE public.profiles SET xp = xp + 1 WHERE id = _uid;

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

-- =========================================================
-- 5. Update register_open to also stamp year on daily_activity
-- =========================================================
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
  _year public.app_year;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;

  SELECT p.last_active_date, p.streak, p.year INTO _last, _streak, _year
    FROM public.profiles p WHERE p.id = _uid;

  IF _last IS NULL OR _last < CURRENT_DATE - INTERVAL '1 day' THEN
    _streak := 1;
  ELSIF _last = CURRENT_DATE - INTERVAL '1 day' THEN
    _streak := COALESCE(_streak, 0) + 1;
  END IF;

  UPDATE public.profiles
     SET streak = _streak, last_active_date = CURRENT_DATE
   WHERE id = _uid;

  INSERT INTO public.daily_activity(user_id, date, opens, year)
  VALUES (_uid, CURRENT_DATE, 1, _year)
  ON CONFLICT (user_id, date) DO UPDATE
    SET opens = public.daily_activity.opens + 1,
        year  = COALESCE(public.daily_activity.year, EXCLUDED.year);

  RETURN QUERY SELECT _streak, CURRENT_DATE;
END;
$function$;

-- =========================================================
-- 6. New RPC: get_year_lifetime_xp
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_year_lifetime_xp(_user_id uuid, _year text)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(COUNT(*), 0)::int
    FROM public.question_progress
   WHERE user_id = _user_id AND year::text = _year;
$function$;

-- =========================================================
-- 7. New RPC: get_year_leaderboard (lifetime, year-scoped)
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_year_leaderboard(_year text, _limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, display_name text, year text, year_xp integer, xp integer, streak integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH year_counts AS (
    SELECT user_id, COUNT(*)::int AS year_xp
      FROM public.question_progress
     WHERE year::text = _year
     GROUP BY user_id
  )
  SELECT p.id, p.display_name, p.year::text,
         COALESCE(yc.year_xp, 0) AS year_xp,
         p.xp, p.streak
    FROM public.profiles p
    LEFT JOIN year_counts yc ON yc.user_id = p.id
   WHERE p.year::text = _year
   ORDER BY COALESCE(yc.year_xp, 0) DESC, p.xp DESC
   LIMIT _limit;
$function$;

-- =========================================================
-- 8. Replace get_weekly_leaderboard: year-aware
-- =========================================================
DROP FUNCTION IF EXISTS public.get_weekly_leaderboard(text, integer);

CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard(_year text DEFAULT NULL, _limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, display_name text, year text, weekly_xp integer, year_xp integer, xp integer, streak integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH wk AS (
    SELECT user_id, SUM(xp)::int AS weekly_xp
      FROM public.weekly_xp
     WHERE week_start = (date_trunc('week', CURRENT_DATE))::date
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
         p.xp, p.streak
    FROM public.profiles p
    LEFT JOIN wk ON wk.user_id = p.id
    LEFT JOIN yc ON yc.user_id = p.id
   WHERE (_year IS NULL OR p.year::text = _year)
   ORDER BY COALESCE(wk.weekly_xp, 0) DESC, p.xp DESC
   LIMIT _limit;
$function$;

-- =========================================================
-- 9. New RPC: claim_or_merge_profile
-- =========================================================
CREATE OR REPLACE FUNCTION public.claim_or_merge_profile(
  _device_id text,
  _display_name text,
  _year public.app_year
)
 RETURNS public.profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _old_uid UUID;
  _result public.profiles;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find any other profile with the same device_id
  IF _device_id IS NOT NULL AND length(_device_id) > 0 THEN
    SELECT id INTO _old_uid
      FROM public.profiles
     WHERE device_id = _device_id AND id <> _uid
     ORDER BY xp DESC, created_at ASC
     LIMIT 1;

    IF _old_uid IS NOT NULL THEN
      -- Move question_progress
      INSERT INTO public.question_progress(user_id, question_id, completed_at, year)
      SELECT _uid, question_id, completed_at, year FROM public.question_progress
       WHERE user_id = _old_uid
      ON CONFLICT (user_id, question_id) DO NOTHING;
      DELETE FROM public.question_progress WHERE user_id = _old_uid;

      -- Move weekly_xp
      INSERT INTO public.weekly_xp(user_id, week_start, year, xp, updated_at)
      SELECT _uid, week_start, year, xp, updated_at FROM public.weekly_xp
       WHERE user_id = _old_uid
      ON CONFLICT (user_id, week_start, year) DO UPDATE
        SET xp = public.weekly_xp.xp + EXCLUDED.xp, updated_at = now();
      DELETE FROM public.weekly_xp WHERE user_id = _old_uid;

      -- Move daily_activity
      INSERT INTO public.daily_activity(user_id, date, opens, questions_done, year)
      SELECT _uid, date, opens, questions_done, year FROM public.daily_activity
       WHERE user_id = _old_uid
      ON CONFLICT (user_id, date) DO UPDATE
        SET opens          = public.daily_activity.opens + EXCLUDED.opens,
            questions_done = public.daily_activity.questions_done + EXCLUDED.questions_done,
            year           = COALESCE(public.daily_activity.year, EXCLUDED.year);
      DELETE FROM public.daily_activity WHERE user_id = _old_uid;

      -- Carry over streak / last_active_date if the old one was higher / newer
      UPDATE public.profiles cur
         SET streak = GREATEST(cur.streak, old.streak),
             last_active_date = GREATEST(cur.last_active_date, old.last_active_date)
        FROM public.profiles old
       WHERE cur.id = _uid AND old.id = _old_uid;

      DELETE FROM public.profiles WHERE id = _old_uid;
    END IF;
  END IF;

  -- Upsert current profile
  INSERT INTO public.profiles(id, display_name, year, device_id)
  VALUES (_uid, _display_name, _year, _device_id)
  ON CONFLICT (id) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        year         = EXCLUDED.year,
        device_id    = COALESCE(EXCLUDED.device_id, public.profiles.device_id);

  -- Recompute xp from authoritative source
  UPDATE public.profiles
     SET xp = (SELECT COUNT(*) FROM public.question_progress WHERE user_id = _uid)
   WHERE id = _uid;

  SELECT * INTO _result FROM public.profiles WHERE id = _uid;
  RETURN _result;
END;
$function$;
