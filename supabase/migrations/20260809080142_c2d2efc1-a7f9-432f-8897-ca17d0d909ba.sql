DROP POLICY IF EXISTS "screen_time readable by authenticated" ON public.screen_time;

CREATE POLICY "Users read own screen_time"
ON public.screen_time
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);