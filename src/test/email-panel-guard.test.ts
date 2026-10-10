import { describe, expect, it, vi } from "vitest";
import { emailPanel, emailStatus, saveSettings, testEmail, type EmailDeps } from "@/lib/email-panel.server";
import { NOT_OWNER } from "@/lib/owner";

const OWNER = "owner-id";
const roles = (owners: string[], fail = false) => ({
  rpc: async (_fn: "has_role", a: { _user_id: string; _role: string }) =>
    fail ? { data: null, error: new Error("down") } : { data: owners.includes(a._user_id) && a._role === "owner", error: null },
});

function spies() {
  const upsert = vi.fn(async () => ({ error: null }));
  const chain: any = { select: () => chain, eq: () => chain, order: () => chain, limit: async () => ({ data: [] }), maybeSingle: async () => ({ data: { enabled: true } }), upsert };
  const from = vi.fn(() => chain);
  const sendEmail = vi.fn(async () => "owner@example.com");
  const gmailAddress = vi.fn(async () => "owner@example.com");
  const deps: EmailDeps = { admin: vi.fn(async () => ({ from })), notify: vi.fn(async () => ({ sendEmail, gmailAddress })) };
  return { deps, from, upsert, sendEmail, gmailAddress };
}
const settings = { enabled: true, min_score: 90, max_sequences_per_day: 2, stage_gap_minutes: 60 };

describe.each([
  ["a signed-in non-owner", roles([OWNER]), "intruder-id"],
  ["anyone when the role check fails", roles([OWNER], true), OWNER],
])("%s", (_label, sb, uid) => {
  it("cannot view the email settings or opportunities", async () => {
    const s = spies();
    expect(await emailPanel(sb, uid, s.deps)).toEqual({ owner: false, s: null, opps: [] });
    expect(s.deps.admin).not.toHaveBeenCalled();
  });
  it("cannot see the connected Gmail address", async () => {
    const s = spies();
    expect(await emailStatus(sb, uid, s.deps)).toMatchObject({ address: null, error: NOT_OWNER, owner: false });
    expect(s.gmailAddress).not.toHaveBeenCalled();
  });
  it("cannot change the email settings", async () => {
    const s = spies();
    expect(await saveSettings(sb, uid, settings, s.deps)).toEqual({ ok: false, error: NOT_OWNER });
    expect(s.deps.admin).not.toHaveBeenCalled();
    expect(s.upsert).not.toHaveBeenCalled();
  });
  it("cannot send a test email", async () => {
    const s = spies();
    expect(await testEmail(sb, uid, s.deps)).toEqual({ ok: false, to: null, error: NOT_OWNER });
    expect(s.deps.notify).not.toHaveBeenCalled();
    expect(s.sendEmail).not.toHaveBeenCalled();
  });
});

describe("the owner (control)", () => {
  it("can view, change and send", async () => {
    const s = spies();
    expect((await emailPanel(roles([OWNER]), OWNER, s.deps)).owner).toBe(true);
    expect((await saveSettings(roles([OWNER]), OWNER, settings, s.deps)).ok).toBe(true);
    expect(s.upsert).toHaveBeenCalledOnce();
    expect((await testEmail(roles([OWNER]), OWNER, s.deps)).ok).toBe(true);
    expect(s.sendEmail).toHaveBeenCalledOnce();
  });
});
