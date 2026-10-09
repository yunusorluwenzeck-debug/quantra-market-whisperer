CREATE TABLE public.email_settings (
  id integer PRIMARY KEY DEFAULT 1,
  enabled boolean NOT NULL DEFAULT false,
  min_score integer NOT NULL DEFAULT 85,
  max_sequences_per_day integer NOT NULL DEFAULT 3,
  stage_gap_minutes integer NOT NULL DEFAULT 120,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.email_settings TO authenticated;
GRANT ALL ON public.email_settings TO service_role;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "email settings read" ON public.email_settings FOR SELECT TO authenticated USING (true);

CREATE TABLE public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  symbol text NOT NULL,
  action text NOT NULL,
  score_at_detect integer NOT NULL,
  price_at_detect numeric NOT NULL,
  stage integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active',
  next_at timestamptz,
  log jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX opportunities_symbol_idx ON public.opportunities (symbol, created_at DESC);
GRANT SELECT ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "opportunities read" ON public.opportunities FOR SELECT TO authenticated USING (true);