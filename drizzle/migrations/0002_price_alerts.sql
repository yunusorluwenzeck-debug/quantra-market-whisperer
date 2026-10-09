CREATE TABLE public.price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  symbol text NOT NULL,
  direction text NOT NULL DEFAULT 'above',
  target numeric NOT NULL,
  triggered_at timestamptz,
  triggered_price numeric,
  seen boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX price_alerts_open_idx ON public.price_alerts (symbol) WHERE triggered_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_alerts TO authenticated;
GRANT ALL ON public.price_alerts TO service_role;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own alerts select" ON public.price_alerts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own alerts insert" ON public.price_alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own alerts update" ON public.price_alerts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own alerts delete" ON public.price_alerts FOR DELETE TO authenticated USING (auth.uid() = user_id);