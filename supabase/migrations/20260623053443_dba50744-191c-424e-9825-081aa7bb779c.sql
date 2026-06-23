ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS custom_theme_1 jsonb,
  ADD COLUMN IF NOT EXISTS custom_theme_2 jsonb;