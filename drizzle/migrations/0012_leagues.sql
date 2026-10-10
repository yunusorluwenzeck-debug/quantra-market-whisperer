CREATE TABLE public.leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 40),
  code text NOT NULL UNIQUE,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.league_members (
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 24),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (league_id, user_id)
);
CREATE INDEX league_members_user_idx ON public.league_members(user_id);
GRANT ALL ON public.leagues TO service_role;
GRANT ALL ON public.league_members TO service_role;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;