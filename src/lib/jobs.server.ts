import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Returns true if the job may run (not run within minMs); records the run. Guards against replayed calls. */
export async function claimJob(job: string, minMs: number) {
  const { data } = await supabaseAdmin.from("job_runs").select("last_run").eq("job", job).maybeSingle();
  if (data && Date.now() - new Date(data.last_run).getTime() < minMs) return false;
  await supabaseAdmin.from("job_runs").upsert({ job, last_run: new Date().toISOString() });
  return true;
}

export function hasBearer(request: Request) {
  return /^Bearer \S+$/.test(request.headers.get("authorization") ?? "");
}
