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
