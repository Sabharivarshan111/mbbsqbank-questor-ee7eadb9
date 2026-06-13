
-- Enum for academic year
CREATE TYPE public.app_year AS ENUM ('first', 'second', 'third', 'final');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  year app_year NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.profiles TO authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles readable by any authenticated user"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Question progress per user
CREATE TABLE public.question_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_progress TO authenticated;
GRANT ALL ON public.question_progress TO service_role;

ALTER TABLE public.question_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own progress"
  ON public.question_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Daily activity log
CREATE TABLE public.daily_activity (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  opens INTEGER NOT NULL DEFAULT 0,
  questions_done INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

GRANT SELECT, INSERT, UPDATE ON public.daily_activity TO authenticated;
GRANT ALL ON public.daily_activity TO service_role;

ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own activity"
  ON public.daily_activity FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own activity"
  ON public.daily_activity FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own activity"
  ON public.daily_activity FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Weekly leaders view (top by questions_done in last 7 days)
CREATE OR REPLACE VIEW public.weekly_leaders AS
SELECT
  p.id,
  p.display_name,
  p.year,
  p.xp,
  p.streak,
  COALESCE(SUM(da.questions_done), 0)::INTEGER AS week_done,
  COALESCE(SUM(da.opens), 0)::INTEGER AS week_opens
FROM public.profiles p
LEFT JOIN public.daily_activity da
  ON da.user_id = p.id AND da.date >= CURRENT_DATE - INTERVAL '6 days'
GROUP BY p.id;

GRANT SELECT ON public.weekly_leaders TO authenticated;
GRANT SELECT ON public.weekly_leaders TO service_role;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC: record a completed question (idempotent), update XP, streak, daily activity
CREATE OR REPLACE FUNCTION public.record_question_done(_question_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _inserted BOOLEAN := false;
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
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_question_done(TEXT) TO authenticated;

-- RPC: register an app open, update streak
CREATE OR REPLACE FUNCTION public.register_open()
RETURNS TABLE(streak INTEGER, last_active_date DATE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _last DATE;
  _streak INTEGER;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;

  SELECT p.last_active_date, p.streak INTO _last, _streak FROM public.profiles p WHERE p.id = _uid;

  IF _last IS NULL OR _last < CURRENT_DATE - INTERVAL '1 day' THEN
    _streak := 1;
  ELSIF _last = CURRENT_DATE - INTERVAL '1 day' THEN
    _streak := COALESCE(_streak, 0) + 1;
  END IF;
  -- if already today, keep streak unchanged

  UPDATE public.profiles
  SET streak = _streak, last_active_date = CURRENT_DATE
  WHERE id = _uid;

  INSERT INTO public.daily_activity(user_id, date, opens)
  VALUES (_uid, CURRENT_DATE, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET opens = public.daily_activity.opens + 1;

  RETURN QUERY SELECT _streak, CURRENT_DATE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_open() TO authenticated;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
