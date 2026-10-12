import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PERIODIC } from "./progress";
import { periodicCode, periodicStatus, periodKeys } from "./progress.server";

const GATEWAY = "https://connector-gateway.lovable.dev/firebase_messaging/v1/projects/_/messages:send";

/** Sends a push to all of a user's devices; removes stale tokens. */
export async function pushToUser(userId: string, title: string, body: string, path = "/missions") {
  const lk = process.env["LOVABLE_API_KEY"], ck = process.env["FIREBASE_MESSAGING_API_KEY"];
  if (!lk || !ck) return 0;
  const { data } = await supabaseAdmin.from("push_tokens").select("token").eq("user_id", userId);
  let sent = 0;
  for (const { token } of data ?? []) {
    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": ck, "Content-Type": "application/json" },
      body: JSON.stringify({ message: { token, notification: { title, body }, data: { path }, webpush: { fcm_options: { link: path } } } }),
    });
    if (res.ok) { sent++; continue; }
    const txt = await res.text();
    console.error(`push failed [${res.status}]: ${txt}`);
    if (res.status === 404 || (res.status === 400 && txt.includes("INVALID_ARGUMENT"))) {
      await supabaseAdmin.from("push_tokens").delete().eq("token", token);
    }
  }
  return sent;
}

/** Claims a one-time send key; false if already sent. */
async function once(userId: string, key: string) {
  const { data } = await supabaseAdmin.from("push_sent").upsert({ user_id: userId, key }, { onConflict: "user_id,key", ignoreDuplicates: true }).select("key");
  return (data?.length ?? 0) > 0;
}

/** Notifies once per mission period when a goal is reached but XP not yet claimed. */
export async function pushCompletedMissions(userId: string) {
  const { count } = await supabaseAdmin.from("push_tokens").select("token", { count: "exact", head: true }).eq("user_id", userId);
  if (!count) return;
  const st = await periodicStatus(userId);
  for (const m of PERIODIC) {
    const code = periodicCode(m.id, st.keys);
    if (!st.met[m.id] || st.claimed.has(code)) continue;
    if (await once(userId, `done:${code}`)) await pushToUser(userId, "Uppdrag klart! 🎯", `"${m.title}" är klart — hämta dina +${m.xp} XP.`);
  }
}

/** Daily: announce new missions (weekly on Mondays) to everyone with a device registered. */
export async function pushNewMissions() {
  const k = periodKeys();
  const monday = k.day === k.week;
  const { data } = await supabaseAdmin.from("push_tokens").select("user_id");
  const users = [...new Set((data ?? []).map((r) => r.user_id))];
  let n = 0;
  for (const u of users) {
    if (!(await once(u, `new:${k.day}`))) continue;
    n += await pushToUser(u, monday ? "Nya dagliga och veckovisa uppdrag" : "Nya dagliga uppdrag", monday ? "En ny vecka har börjat — nya mål väntar i StockLab." : "Dagens fråga och nya mål väntar i StockLab.");
  }
  return n;
}
