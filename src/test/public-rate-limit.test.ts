import { describe, it, expect, vi, beforeEach } from "vitest";

// In-memory stand-in for the take_rate_slot database function.
const counts = new Map<string, number>();
const inserts: { kind: string; detail: Record<string, unknown> }[] = [];
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: async (_fn: string, a: { _user: string; _action: string; _max: number }) => {
      const k = `${a._user}|${a._action}`;
      const n = (counts.get(k) ?? 0) + 1;
      if (n > a._max) return { data: false, error: null };
      counts.set(k, n);
      return { data: true, error: null };
    },
    from: () => ({ insert: async (row: { kind: string; detail: Record<string, unknown> }) => { inserts.push(row); return { error: null }; } }),
  },
}));

import { takePublicSlot, PUBLIC_LIMITS } from "@/lib/security.server";

beforeEach(() => { counts.clear(); inserts.length = 0; });

async function run(ip: string, action: keyof typeof PUBLIC_LIMITS, times: number) {
  const L = PUBLIC_LIMITS[action];
  const out: boolean[] = [];
  for (let i = 0; i < times; i++) out.push(await takePublicSlot(ip, action, L.perIp, L.global));
  return out;
}

describe.each(["public_sign_in", "oauth_report"] as const)("public limits: %s", (action) => {
  const L = PUBLIC_LIMITS[action];

  it("rejects one visitor after the per-visitor cap", async () => {
    const r = await run("1.1.1.1", action, L.perIp + 3);
    expect(r.slice(0, L.perIp).every(Boolean)).toBe(true);
    expect(r.slice(L.perIp).some(Boolean)).toBe(false);
    expect(inserts.some((e) => e.kind === "public_rate_limited" && e.detail["scope"] === "visitor" && e.detail["endpoint"] === action)).toBe(true);
  });

  it("other visitors still get through until the app-wide cap, then everyone is rejected", async () => {
    let allowed = 0;
    for (let v = 0; allowed < L.global; v++) allowed += (await run(`10.0.${v >> 8}.${v & 255}`, action, L.perIp)).filter(Boolean).length;
    expect(allowed).toBe(L.global);
    expect(await takePublicSlot("9.9.9.9", action, L.perIp, L.global)).toBe(false);
    expect(inserts.some((e) => e.detail["scope"] === "app-wide" && e.detail["endpoint"] === action)).toBe(true);
  });
});
