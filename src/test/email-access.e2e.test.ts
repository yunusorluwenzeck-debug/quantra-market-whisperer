import { describe, expect, it } from "vitest";
import { isOwner } from "@/lib/owner";

// End-to-end checks with two REAL signed-in accounts against the live backend.
// Provide access tokens via E2E_OWNER_TOKEN and E2E_OTHER_TOKEN; skipped otherwise.
const URL = "https://lvmkmmeaiilhsmoeesqe.supabase.co";
const KEY = "sb_publishable_Q_UM8HuK6MWw1vLZbjCc1g_j0j8KISz";
const OWNER = process.env.E2E_OWNER_TOKEN;
const OTHER = process.env.E2E_OTHER_TOKEN;

const headers = (t: string) => ({ apikey: KEY, Authorization: `Bearer ${t}`, "Content-Type": "application/json" });

async function userId(t: string) {
  const r = await fetch(`${URL}/auth/v1/user`, { headers: headers(t) });
  expect(r.status).toBe(200);
  return (await r.json()).id as string;
}
function roleClient(t: string) {
  return {
    rpc: async (fn: "has_role", args: { _user_id: string; _role: "owner" | "user" }) => {
      const r = await fetch(`${URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: headers(t), body: JSON.stringify(args) });
      return { data: r.ok ? ((await r.json()) as boolean) : null, error: r.ok ? null : new Error(String(r.status)) };
    },
  };
}
async function rows(t: string, table: string) {
  const r = await fetch(`${URL}/rest/v1/${table}?select=*&limit=5`, { headers: headers(t) });
  const b = await r.json().catch(() => null);
  return Array.isArray(b) ? b : [];
}
async function tryWrite(t: string) {
  const r = await fetch(`${URL}/rest/v1/email_settings?id=eq.1`, {
    method: "PATCH", headers: { ...headers(t), Prefer: "return=representation" }, body: JSON.stringify({ enabled: true }),
  });
  const b = await r.json().catch(() => null);
  return Array.isArray(b) ? b.length : 0;
}

describe.skipIf(!OWNER || !OTHER)("email alert settings — two real accounts", () => {
  it("are two different accounts", async () => {
    expect(await userId(OWNER!)).not.toBe(await userId(OTHER!));
  });
  it("owner passes the email-panel guard", async () => {
    expect(await isOwner(roleClient(OWNER!), await userId(OWNER!))).toBe(true);
  });
  it("second account is blocked by the email-panel guard", async () => {
    expect(await isOwner(roleClient(OTHER!), await userId(OTHER!))).toBe(false);
  });
  it("second account cannot see whether the owner is owner", async () => {
    const { data } = await roleClient(OTHER!).rpc("has_role", { _user_id: await userId(OWNER!), _role: "owner" });
    expect(data).not.toBe(true);
  });
  for (const t of ["email_settings", "opportunities"]) {
    it(`second account cannot read ${t} directly`, async () => {
      expect(await rows(OTHER!, t)).toHaveLength(0);
    });
  }
  it("second account cannot change email settings directly", async () => {
    expect(await tryWrite(OTHER!)).toBe(0);
  });
});
