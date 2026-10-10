CREATE TABLE public.rate_hits (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rate_hits_lookup ON public.rate_hits (user_id, action, created_at DESC);
GRANT ALL ON public.rate_hits TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.rate_hits_id_seq TO service_role;
ALTER TABLE public.rate_hits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.take_rate_slot(_user uuid, _action text, _max int, _window_sec int)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(_user::text || _action));
  SELECT count(*) INTO n FROM rate_hits WHERE user_id=_user AND action=_action AND created_at > now() - make_interval(secs => _window_sec);
  IF n >= _max THEN RETURN false; END IF;
  INSERT INTO rate_hits(user_id, action) VALUES (_user, _action);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.take_rate_slot(uuid, text, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.take_rate_slot(uuid, text, int, int) TO service_role;

CREATE OR REPLACE FUNCTION public.purge_old_data()
 RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $function$
  DELETE FROM public.bot_events WHERE created_at < now() - interval '180 days';
  DELETE FROM public.security_events WHERE created_at < now() - interval '180 days';
  DELETE FROM public.order_keys WHERE created_at < now() - interval '2 days';
  DELETE FROM public.rate_hits WHERE created_at < now() - interval '2 days';
  DELETE FROM public.opportunities WHERE status <> 'active' AND created_at < now() - interval '90 days';
$function$;