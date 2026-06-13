
-- weekly_xp table
CREATE TABLE public.weekly_xp (
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  xp integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week_start)
);

GRANT SELECT ON public.weekly_xp TO authenticated;
GRANT ALL ON public.weekly_xp TO service_role;

ALTER TABLE public.weekly_xp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Weekly xp readable by authenticated"
  ON public.weekly_xp FOR SELECT TO authenticated USING (true);

-- realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.weekly_xp;
ALTER TABLE public.weekly_xp REPLICA IDENTITY FULL;

-- update record_question_done to also write weekly_xp
CREATE OR REPLACE FUNCTION public.record_question_done(_question_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _inserted BOOLEAN := false;
  _week_start DATE;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;

  INSERT INTO public.question_progress(user_id, question_id)
  VALUES (_uid, _question_id)
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS _inserted = ROW_COUNT;

  IF _inserted THEN
    UPDATE public.profiles SET xp = xp + 1 WHERE id = _uid;

    INSERT INTO public.daily_activity(user_id, date, questions_done)
    VALUES (_uid, CURRENT_DATE, 1)
    ON CONFLICT (user_id, date)
    DO UPDATE SET questions_done = public.daily_activity.questions_done + 1;

    _week_start := (date_trunc('week', CURRENT_DATE))::date;
    INSERT INTO public.weekly_xp(user_id, week_start, xp, updated_at)
    VALUES (_uid, _week_start, 1, now())
    ON CONFLICT (user_id, week_start)
    DO UPDATE SET xp = public.weekly_xp.xp + 1, updated_at = now();
  END IF;
END;
$$;

-- weekly leaderboard fn
CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard(_year text DEFAULT NULL, _limit int DEFAULT 50)
RETURNS TABLE (
  id uuid,
  display_name text,
  year text,
  weekly_xp integer,
  xp integer,
  streak integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.year::text, COALESCE(w.xp, 0) AS weekly_xp, p.xp, p.streak
  FROM public.profiles p
  LEFT JOIN public.weekly_xp w
    ON w.user_id = p.id
   AND w.week_start = (date_trunc('week', CURRENT_DATE))::date
  WHERE (_year IS NULL OR p.year::text = _year)
  ORDER BY COALESCE(w.xp, 0) DESC, p.xp DESC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_weekly_leaderboard(text, int) TO authenticated, anon;
