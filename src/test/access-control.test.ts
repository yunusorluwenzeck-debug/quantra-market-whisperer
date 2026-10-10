import { describe, expect, it } from "vitest";
import { isOwner } from "@/lib/owner";

const URL = "https://lvmkmmeaiilhsmoeesqe.supabase.co";
const KEY = "sb_publishable_Q_UM8HuK6MWw1vLZbjCc1g_j0j8KISz";

async function anonRead(table: string) {
  const r = await fetch(`${URL}/rest/v1/${table}?select=*&limit=5`, { headers: { apikey: KEY } });
  const body = await r.json().catch(() => null);
  return { status: r.status, rows: Array.isArray(body) ? body : [] };
}

describe("signed-out visitors (live database)", () => {
  for (const table of ["stocks", "ai_reports", "email_settings", "opportunities", "user_roles"]) {
    it(`cannot read ${table}`, async () => {
      const { rows } = await anonRead(table);
      expect(rows).toHaveLength(0);
    });
  }
});

describe("email alert access guard", () => {
  const client = (owners: string[]) => ({
    rpc: async (_fn: "has_role", a: { _user_id: string; _role: string }) => ({ data: owners.includes(a._user_id) && a._role === "owner", error: null }),
  });
  it("allows the owner", async () => {
    expect(await isOwner(client(["owner-id"]), "owner-id")).toBe(true);
  });
  it("blocks other signed-in users", async () => {
    expect(await isOwner(client(["owner-id"]), "someone-else")).toBe(false);
  });
  it("blocks when the role check errors", async () => {
    const broken = { rpc: async () => ({ data: true, error: new Error("x") }) };
    expect(await isOwner(broken, "owner-id")).toBe(false);
  });
});
