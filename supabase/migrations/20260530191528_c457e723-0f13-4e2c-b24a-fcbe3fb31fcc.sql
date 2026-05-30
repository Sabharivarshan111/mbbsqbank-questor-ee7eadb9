CREATE TABLE public.study_presence (
  device_id TEXT PRIMARY KEY,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_presence TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_presence TO authenticated;
GRANT ALL ON public.study_presence TO service_role;

ALTER TABLE public.study_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read presence"
  ON public.study_presence FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert presence"
  ON public.study_presence FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update presence"
  ON public.study_presence FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete presence"
  ON public.study_presence FOR DELETE
  USING (true);

CREATE INDEX idx_study_presence_last_seen ON public.study_presence(last_seen);