CREATE TABLE public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  kind text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or owner reads events" ON public.security_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'owner'));
CREATE INDEX security_events_created_idx ON public.security_events(created_at DESC);

CREATE TABLE public.order_keys (
  user_id uuid NOT NULL,
  key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
GRANT ALL ON public.order_keys TO service_role;
ALTER TABLE public.order_keys ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.purge_old_data() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.bot_events WHERE created_at < now() - interval '180 days';
  DELETE FROM public.security_events WHERE created_at < now() - interval '180 days';
  DELETE FROM public.order_keys WHERE created_at < now() - interval '2 days';
  DELETE FROM public.opportunities WHERE status <> 'active' AND created_at < now() - interval '90 days';
$$;
REVOKE EXECUTE ON FUNCTION public.purge_old_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_old_data() TO service_role;

CREATE OR REPLACE FUNCTION public.security_table_report() RETURNS TABLE(table_name text, rls_enabled boolean, policy_count int, anon_select boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.relname::text, c.relrowsecurity,
    (SELECT count(*)::int FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=c.relname),
    has_table_privilege('anon', c.oid, 'SELECT')
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r' ORDER BY 1;
$$;
REVOKE EXECUTE ON FUNCTION public.security_table_report() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.security_table_report() TO service_role;

SELECT cron.schedule('purge-old-data', '17 3 * * *', 'SELECT public.purge_old_data()');