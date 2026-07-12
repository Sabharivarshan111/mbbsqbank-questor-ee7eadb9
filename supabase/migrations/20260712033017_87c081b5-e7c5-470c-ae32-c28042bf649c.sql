
CREATE TABLE public.handwritten_notes (
  subtopic_key TEXT PRIMARY KEY,
  year TEXT NOT NULL,
  subject TEXT NOT NULL,
  subtopic_name TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.handwritten_notes TO anon;
GRANT SELECT ON public.handwritten_notes TO authenticated;
GRANT ALL ON public.handwritten_notes TO service_role;

ALTER TABLE public.handwritten_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read handwritten notes"
  ON public.handwritten_notes FOR SELECT
  USING (true);

CREATE INDEX handwritten_notes_year_subject_idx
  ON public.handwritten_notes(year, subject);
