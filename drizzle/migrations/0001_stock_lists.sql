CREATE TABLE public.stock_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  symbols text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_lists TO authenticated;
GRANT ALL ON public.stock_lists TO service_role;
ALTER TABLE public.stock_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lists select" ON public.stock_lists FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own lists insert" ON public.stock_lists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own lists update" ON public.stock_lists FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own lists delete" ON public.stock_lists FOR DELETE TO authenticated USING (auth.uid() = user_id);