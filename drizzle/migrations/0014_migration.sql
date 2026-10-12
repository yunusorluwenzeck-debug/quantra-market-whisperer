CREATE TABLE public.challenge_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  scenario_id text NOT NULL,
  choices jsonb NOT NULL,
  score integer NOT NULL,
  result jsonb NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX challenge_runs_user_idx ON public.challenge_runs(user_id, completed_at DESC);
ALTER TABLE public.challenge_runs ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.challenge_runs TO authenticated;
GRANT ALL ON public.challenge_runs TO service_role;
CREATE POLICY "own challenge runs" ON public.challenge_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);