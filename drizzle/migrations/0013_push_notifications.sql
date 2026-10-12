CREATE TABLE public.push_tokens (
  token text PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.push_tokens TO authenticated;
GRANT ALL ON public.push_tokens TO service_role;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own push tokens" ON public.push_tokens FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX push_tokens_user ON public.push_tokens(user_id);

CREATE TABLE public.push_sent (
  user_id uuid NOT NULL,
  key text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
GRANT ALL ON public.push_sent TO service_role;
ALTER TABLE public.push_sent ENABLE ROW LEVEL SECURITY;

SELECT cron.schedule('stocklab-mission-push', '1 22,23 * * *', $$select net.http_post(url:='https://project--7bf53072-5f61-4123-83e9-f2954d894527-dev.lovable.app/api/public/hooks/mission-push', headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select token from public.cron_tokens where name='hooks')), body:='{}'::jsonb, timeout_milliseconds:=120000)$$);