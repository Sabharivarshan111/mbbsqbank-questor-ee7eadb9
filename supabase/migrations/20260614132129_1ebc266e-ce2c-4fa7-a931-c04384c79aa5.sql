
-- 1. screen_time table
CREATE TABLE IF NOT EXISTS public.screen_time (
  user_id UUID NOT NULL,
  year public.app_year NOT NULL,
  seconds BIGINT NOT NULL DEFAULT 0,
  weekly_seconds BIGINT NOT NULL DEFAULT 0,
  week_start DATE NOT NULL DEFAULT (date_trunc('week', CURRENT_DATE))::date,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, year)
);

GRANT SELECT, INSERT, UPDATE ON public.screen_time TO authenticated;
GRANT ALL ON public.screen_time TO service_role;

ALTER TABLE public.screen_time ENABLE ROW LEVEL SECURITY;

CREATE POLICY "screen_time readable by authenticated"
  ON public.screen_time FOR SELECT TO authenticated USING (true);
CREATE POLICY "users insert own screen_time"
  ON public.screen_time FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own screen_time"
  ON public.screen_time FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.screen_time;

-- 2. record_screen_time RPC
CREATE OR REPLACE FUNCTION public.record_screen_time(_seconds integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid UUID := auth.uid();
  _year public.app_year;
  _wk DATE := (date_trunc('week', CURRENT_DATE))::date;
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
$$;

GRANT EXECUTE ON FUNCTION public.record_screen_time(integer) TO authenticated;

-- 3. Updated leaderboards with screen-time tiebreaker
DROP FUNCTION IF EXISTS public.get_year_leaderboard(text, integer);
CREATE OR REPLACE FUNCTION public.get_year_leaderboard(_year text, _limit integer DEFAULT 50)
RETURNS TABLE(id uuid, display_name text, year text, year_xp integer, xp integer, streak integer, year_seconds bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH year_counts AS (
    SELECT user_id, COUNT(*)::int AS year_xp
      FROM public.question_progress
     WHERE year::text = _year
     GROUP BY user_id
  )
  SELECT p.id, p.display_name, p.year::text,
         COALESCE(yc.year_xp, 0) AS year_xp,
         p.xp, p.streak,
         COALESCE(st.seconds, 0)::bigint AS year_seconds
    FROM public.profiles p
    LEFT JOIN year_counts yc ON yc.user_id = p.id
    LEFT JOIN public.screen_time st ON st.user_id = p.id AND st.year::text = _year
   WHERE p.year::text = _year
   ORDER BY COALESCE(yc.year_xp, 0) DESC,
            p.streak DESC,
            COALESCE(st.seconds, 0) DESC,
            p.display_name ASC
   LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_year_leaderboard(text, integer) TO authenticated, anon;

DROP FUNCTION IF EXISTS public.get_weekly_leaderboard(text, integer);
CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard(_year text DEFAULT NULL::text, _limit integer DEFAULT 50)
RETURNS TABLE(id uuid, display_name text, year text, weekly_xp integer, year_xp integer, xp integer, streak integer, weekly_seconds bigint, year_seconds bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
         p.xp, p.streak,
         COALESCE(CASE WHEN st.week_start = (date_trunc('week', CURRENT_DATE))::date THEN st.weekly_seconds ELSE 0 END, 0)::bigint AS weekly_seconds,
         COALESCE(st.seconds, 0)::bigint AS year_seconds
    FROM public.profiles p
    LEFT JOIN wk ON wk.user_id = p.id
    LEFT JOIN yc ON yc.user_id = p.id
    LEFT JOIN public.screen_time st ON st.user_id = p.id AND (_year IS NULL OR st.year::text = _year)
   WHERE (_year IS NULL OR p.year::text = _year)
   ORDER BY COALESCE(wk.weekly_xp, 0) DESC,
            p.streak DESC,
            COALESCE(CASE WHEN st.week_start = (date_trunc('week', CURRENT_DATE))::date THEN st.weekly_seconds ELSE 0 END, 0) DESC,
            p.display_name ASC
   LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_weekly_leaderboard(text, integer) TO authenticated, anon;
