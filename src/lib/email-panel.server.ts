import { isOwner, NOT_OWNER } from "./owner";

type RoleClient = Parameters<typeof isOwner>[0];
export type EmailSettingsInput = { enabled: boolean; min_score: number; max_sequences_per_day: number; stage_gap_minutes: number };

/** Privileged operations, loaded lazily and only after the owner check passes. */
export type EmailDeps = {
  admin: () => Promise<any>;
  notify: () => Promise<{ sendEmail: (subject: string, body: string) => Promise<string>; gmailAddress: () => Promise<string> }>;
};

export const defaultDeps: EmailDeps = {
  admin: async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin,
  notify: () => import("./notify.server"),
};

const msg = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

export async function emailStatus(sb: RoleClient, userId: string, deps = defaultDeps) {
  if (!(await isOwner(sb, userId))) return { address: null, error: NOT_OWNER, owner: false };
  try { return { address: await (await deps.notify()).gmailAddress(), error: null, owner: true }; }
  catch (e) { return { address: null, error: msg(e, "Gmail unavailable"), owner: true }; }
}

export async function testEmail(sb: RoleClient, userId: string, deps = defaultDeps) {
  if (!(await isOwner(sb, userId))) return { ok: false, to: null, error: NOT_OWNER };
  try {
    const to = await (await deps.notify()).sendEmail("Quantra test email", `Your Gmail connection works.\n\nSent: ${new Date().toISOString()}`);
    return { ok: true, to, error: null };
  } catch (e) { return { ok: false, to: null, error: msg(e, "Send failed") }; }
}

export async function emailPanel(sb: RoleClient, userId: string, deps = defaultDeps) {
  if (!(await isOwner(sb, userId))) return { owner: false, s: null, opps: [] as any[] };
  const admin = await deps.admin();
  const [s, o] = await Promise.all([
    admin.from("email_settings").select("enabled,min_score,max_sequences_per_day,stage_gap_minutes").eq("id", 1).maybeSingle(),
    admin.from("opportunities").select("id,code,symbol,action,stage,status,score_at_detect,created_at").order("created_at", { ascending: false }).limit(15),
  ]);
  return { owner: true, s: s.data, opps: (o.data ?? []) as any[] };
}

export async function saveSettings(sb: RoleClient, userId: string, data: EmailSettingsInput, deps = defaultDeps) {
  if (!(await isOwner(sb, userId))) return { ok: false, error: NOT_OWNER };
  const admin = await deps.admin();
  const { error } = await admin.from("email_settings").upsert({ id: 1, ...data, updated_at: new Date().toISOString() });
  return { ok: !error, error: error ? "Could not save settings" : null };
}
