
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_date DATE NOT NULL,
  title TEXT NOT NULL,
  important BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own calendar events" ON public.calendar_events
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX calendar_events_user_date_idx ON public.calendar_events(user_id, event_date);
CREATE TRIGGER calendar_events_updated_at BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  drawing_data TEXT,
  kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text','drawing','mixed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notes TO authenticated;
GRANT ALL ON public.user_notes TO service_role;
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notes" ON public.user_notes
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX user_notes_user_updated_idx ON public.user_notes(user_id, updated_at DESC);
CREATE TRIGGER user_notes_updated_at BEFORE UPDATE ON public.user_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notes;
ALTER TABLE public.calendar_events REPLICA IDENTITY FULL;
ALTER TABLE public.user_notes REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.merge_into_current_user(_old_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _old_user_id IS NULL OR _old_user_id = _uid THEN RETURN; END IF;

  INSERT INTO public.question_progress(user_id, question_id, completed_at, year)
  SELECT _uid, question_id, completed_at, year
    FROM public.question_progress WHERE user_id = _old_user_id
  ON CONFLICT (user_id, question_id) DO NOTHING;
  DELETE FROM public.question_progress WHERE user_id = _old_user_id;

  INSERT INTO public.weekly_xp(user_id, week_start, year, xp, updated_at)
  SELECT _uid, week_start, year, xp, updated_at FROM public.weekly_xp
   WHERE user_id = _old_user_id
  ON CONFLICT (user_id, week_start, year) DO UPDATE
    SET xp = public.weekly_xp.xp + EXCLUDED.xp, updated_at = now();
  DELETE FROM public.weekly_xp WHERE user_id = _old_user_id;

  INSERT INTO public.daily_activity(user_id, date, opens, questions_done, year)
  SELECT _uid, date, opens, questions_done, year FROM public.daily_activity
   WHERE user_id = _old_user_id
  ON CONFLICT (user_id, date) DO UPDATE
    SET opens = public.daily_activity.opens + EXCLUDED.opens,
        questions_done = public.daily_activity.questions_done + EXCLUDED.questions_done,
        year = COALESCE(public.daily_activity.year, EXCLUDED.year);
  DELETE FROM public.daily_activity WHERE user_id = _old_user_id;

  INSERT INTO public.screen_time(user_id, year, seconds, weekly_seconds, week_start, updated_at)
  SELECT _uid, year, seconds, weekly_seconds, week_start, updated_at
    FROM public.screen_time WHERE user_id = _old_user_id
  ON CONFLICT (user_id, year) DO UPDATE
    SET seconds = public.screen_time.seconds + EXCLUDED.seconds,
        weekly_seconds = public.screen_time.weekly_seconds + EXCLUDED.weekly_seconds,
        week_start = GREATEST(public.screen_time.week_start, EXCLUDED.week_start),
        updated_at = now();
  DELETE FROM public.screen_time WHERE user_id = _old_user_id;

  UPDATE public.calendar_events SET user_id = _uid WHERE user_id = _old_user_id;
  UPDATE public.user_notes SET user_id = _uid WHERE user_id = _old_user_id;

  UPDATE public.profiles cur
     SET streak = GREATEST(cur.streak, old.streak),
         last_active_date = GREATEST(cur.last_active_date, old.last_active_date)
    FROM public.profiles old
   WHERE cur.id = _uid AND old.id = _old_user_id;

  DELETE FROM public.profiles WHERE id = _old_user_id;

  UPDATE public.profiles
     SET xp = (SELECT COUNT(*)::int FROM public.question_progress WHERE user_id = _uid)
   WHERE id = _uid;
END;
$function$;
