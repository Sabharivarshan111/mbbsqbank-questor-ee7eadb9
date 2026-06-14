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
   ORDER BY COALESCE(yc.year_xp, 0) DESC, p.streak DESC, p.display_name ASC
   LIMIT _limit;
$function$;

CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard(_year text DEFAULT NULL::text, _limit integer DEFAULT 50)
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
   ORDER BY COALESCE(wk.weekly_xp, 0) DESC, p.streak DESC, p.display_name ASC
   LIMIT _limit;
$function$;