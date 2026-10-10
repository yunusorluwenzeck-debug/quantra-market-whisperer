import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Returns true if the job may run (not run within minMs); records the run. Guards against replayed calls. */
export async function claimJob(job: string, minMs: number) {
  const { data } = await supabaseAdmin.from("job_runs").select("last_run").eq("job", job).maybeSingle();
  if (data && Date.now() - new Date(data.last_run).getTime() < minMs) return false;
  await supabaseAdmin.from("job_runs").upsert({ job, last_run: new Date().toISOString() });
  return true;
}

/** Verifies the bearer token against the server-only cron token stored in the database (never exposed to browsers). */
export async function isCronCaller(request: Request) {
  const m = /^Bearer ([A-Za-z0-9]{32,128})$/.exec(request.headers.get("authorization") ?? "");
  if (!m) return false;
  const { data, error } = await supabaseAdmin.rpc("verify_cron_token", { _token: m[1]! });
  return !error && data === true;
}
