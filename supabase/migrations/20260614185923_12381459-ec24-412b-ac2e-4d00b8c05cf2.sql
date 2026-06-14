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
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;

  SELECT p.last_active_date, p.streak, p.year INTO _last, _streak, _year
    FROM public.profiles p WHERE p.id = _uid;

  IF _last IS NULL THEN
    _streak := 1;
  ELSE
    _gap := CURRENT_DATE - _last;
    IF _gap > 1 THEN
      _streak := 1;
    ELSIF _gap = 1 THEN
      _streak := COALESCE(_streak, 0) + 1;
    ELSE
      -- same day; ensure at least 1
      _streak := GREATEST(COALESCE(_streak, 0), 1);
    END IF;
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