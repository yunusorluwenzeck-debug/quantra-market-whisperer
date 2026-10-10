// Temporary account protection: too many failed password attempts lock that email for a while,
// and the owner is emailed about locks and sign-ins from a new country. Emails are stored hashed only.
import { logEvent } from "./security.server";

export const MAX_FAILS = 5;
export const WINDOW_MIN = 15;
export const LOCK_MIN = 30;

export async function hashEmail(email: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email.trim().toLowerCase()));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

async function notifyOwner(subject: string, body: string) {
  try {
    const { sendEmail } = await import("./notify.server");
    await sendEmail(`[Quantra security] ${subject}`, body);
  } catch (e) {
    console.error("security notify failed", e instanceof Error ? e.message : e);
  }
}

/** Returns the lock expiry if this email is currently locked. */
export async function lockedUntil(emailHash: string): Promise<string | null> {
  const db = await admin();
  const since = new Date(Date.now() - LOCK_MIN * 60_000).toISOString();
  const { data } = await db.from("security_events").select("created_at")
    .eq("kind", "account_locked").eq("detail->>email_hash", emailHash).gte("created_at", since)
    .order("created_at", { ascending: false }).limit(1);
  if (!data?.length) return null;
  return new Date(new Date(data[0]!.created_at).getTime() + LOCK_MIN * 60_000).toISOString();
}

export async function recordFailure(emailHash: string, country: string | null) {
  if (await lockedUntil(emailHash)) return { locked: true };
  await logEvent(null, "sign_in_failed", { email_hash: emailHash, country });
  const db = await admin();
  const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
  const { count } = await db.from("security_events").select("id", { count: "exact", head: true })
    .eq("kind", "sign_in_failed").eq("detail->>email_hash", emailHash).gte("created_at", since);
  if ((count ?? 0) >= MAX_FAILS) {
    await logEvent(null, "account_locked", { email_hash: emailHash, minutes: LOCK_MIN, country });
    await notifyOwner("Account temporarily locked",
      `${count} failed sign-in attempts in ${WINDOW_MIN} minutes for one account (from ${country ?? "unknown country"}).\n` +
      `Password sign-in for that account is paused for ${LOCK_MIN} minutes.\nTime: ${new Date().toISOString()}\n\nNo passwords or tokens are included in this email.`);
    return { locked: true };
  }
  return { locked: false };
}

/** Logs a successful sign-in; emails the owner if it comes from a country this user hasn't signed in from before. */
export async function recordSuccess(userId: string, country: string | null) {
  const db = await admin();
  const { data: prior } = await db.from("security_events").select("detail")
    .eq("user_id", userId).eq("kind", "sign_in").order("created_at", { ascending: false }).limit(50);
  const known = new Set((prior ?? []).map((r) => (r.detail as { country?: string })?.country).filter(Boolean));
  const isNew = !!country && known.size > 0 && !known.has(country);
  await logEvent(userId, "sign_in", { country });
  if (isNew) {
    await logEvent(userId, "sign_in_new_country", { country });
    await notifyOwner("Sign-in from a new country",
      `An account signed in from ${country}, which it has not used before.\nTime: ${new Date().toISOString()}\nIf this wasn't expected, use the emergency stop and change the password.`);
  }
  return { newCountry: isNew };
}
