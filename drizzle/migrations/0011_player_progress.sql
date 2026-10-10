CREATE TABLE public.player_achievements (
  user_id uuid NOT NULL,
  code text NOT NULL,
  xp integer NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, code)
);
GRANT SELECT ON public.player_achievements TO authenticated;
GRANT ALL ON public.player_achievements TO service_role;
ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own achievements" ON public.player_achievements FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.player_missions (
  user_id uuid NOT NULL,
  code text NOT NULL,
  xp integer NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, code)
);
GRANT SELECT ON public.player_missions TO authenticated;
GRANT ALL ON public.player_missions TO service_role;
ALTER TABLE public.player_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own missions" ON public.player_missions FOR SELECT TO authenticated USING (auth.uid() = user_id);