DROP POLICY IF EXISTS "jobs public read" ON public.job_runs;
REVOKE SELECT ON public.job_runs FROM anon, authenticated;
CREATE OR REPLACE FUNCTION public.last_scan_time()
RETURNS timestamptz LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT last_run FROM public.job_runs WHERE job = 'scan' $$;
GRANT EXECUTE ON FUNCTION public.last_scan_time() TO anon, authenticated;