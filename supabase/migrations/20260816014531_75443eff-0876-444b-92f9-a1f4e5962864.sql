CREATE TYPE public.diagram_kind AS ENUM (
  'flowchart',
  'table',
  'histology_plate',
  'anatomy',
  'lifecycle',
  'algorithm',
  'comparison',
  'other'
);

CREATE TYPE public.diagram_status AS ENUM (
  'pending',
  'prompt_ready',
  'generated',
  'optimized',
  'uploaded',
  'failed',
  'approved'
);

CREATE TABLE public.question_diagrams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id text NOT NULL UNIQUE,
  year text NOT NULL,
  subject text NOT NULL,
  subtopic_key text NOT NULL,
  question_text text NOT NULL,
  question_type text NOT NULL,
  diagram_kind public.diagram_kind NOT NULL DEFAULT 'other',
  needs_ai_raster boolean NOT NULL DEFAULT false,
  render_prompt text NOT NULL,
  status public.diagram_status NOT NULL DEFAULT 'pending',
  storage_path text,
  public_url text,
  svg_code text,
  error_log text,
  reviewed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.question_diagrams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_diagrams TO service_role;

ALTER TABLE public.question_diagrams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read approved diagrams"
ON public.question_diagrams
FOR SELECT
TO authenticated
USING (status = 'approved' OR reviewed = true);

CREATE POLICY "Service role can manage diagrams"
ON public.question_diagrams
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_question_diagrams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_question_diagrams_updated_at
BEFORE UPDATE ON public.question_diagrams
FOR EACH ROW EXECUTE FUNCTION public.update_question_diagrams_updated_at();