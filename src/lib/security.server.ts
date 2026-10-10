// Server-only security helpers. Never log tokens, passwords or secrets in `detail`.
const SECRETISH = /token|secret|password|key|authorization|cookie/i;

function scrub(detail: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(detail)) out[k] = SECRETISH.test(k) ? "[redacted]" : v;
  return out;
}

export async function logEvent(userId: string | null, kind: string, detail: Record<string, unknown> = {}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("security_events").insert({ user_id: userId, kind, detail: scrub(detail) as never });
  } catch (e) {
    console.error("security log failed", e instanceof Error ? e.message : e);
  }
}

/** Returns false if this order key was already used (double-click or replayed request). */
export async function claimOrderKey(userId: string, key: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("order_keys").insert({ user_id: userId, key });
  return !error;
}

/** Turns internal errors into safe user-facing messages. Known business errors pass through. */
const SAFE = ["Not enough cash", "Not enough shares", "Invalid quantity or price", "Invalid side", "Enter an amount"];
export function safeError(e: unknown, fallback: string) {
  const m = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "";
  const hit = SAFE.find((s) => m.includes(s));
  if (!hit) console.error(fallback, m);
  return hit ?? fallback;
}

/** Per-user hourly limits for sensitive actions. */
export const LIMITS = {
  order: 60,
  run_bot: 10,
  reset_account: 5,
  save_settings: 60,
  test_email: 5,
} as const;
export const RATE_LIMITED = "Too many requests — please wait a while and try again";

/** Returns false (and logs) when the user has hit the hourly limit for this action. */
export async function takeRateSlot(userId: string, action: keyof typeof LIMITS) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("take_rate_slot", { _user: userId, _action: action, _max: LIMITS[action], _window_sec: 3600 });
    if (error) throw error;
    if (data === false) await logEvent(userId, "rate_limited", { action });
    return data !== false;
  } catch (e) {
    console.error("rate limit check failed", e instanceof Error ? e.message : e);
    return true; // fail open so a database hiccup doesn't block normal use
  }
}

/**
 * Rate limit for public (signed-out) endpoints, keyed by a hash of the caller's IP plus a global cap,
 * so anonymous callers cannot create unlimited records or alerts.
 */
export async function takePublicSlot(ip: string | null, action: string, perIp: number, global: number) {
  const toUuid = async (v: string) => {
    const h = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v))), (b) => b.toString(16).padStart(2, "0")).join("");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
  };
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const g = await supabaseAdmin.rpc("take_rate_slot", { _user: await toUuid("global"), _action: action, _max: global, _window_sec: 3600 });
    if (g.data === false) return false;
    const r = await supabaseAdmin.rpc("take_rate_slot", { _user: await toUuid(`ip:${ip ?? "unknown"}`), _action: action, _max: perIp, _window_sec: 3600 });
    return r.data !== false;
  } catch (e) {
    console.error("public rate limit failed", e instanceof Error ? e.message : e);
    return true;
  }
}
