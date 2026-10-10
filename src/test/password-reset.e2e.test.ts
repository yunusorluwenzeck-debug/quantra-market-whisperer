// End-to-end: recovery link -> verify link -> set new password -> old password fails, new works.
// Uses a throwaway account that is deleted afterwards. Skips without server credentials.
import { describe, it, expect, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = process.env['SUPABASE_URL'] ?? process.env['VITE_SUPABASE_URL'];
const service = process.env['SUPABASE_SERVICE_ROLE_KEY'];
const pub = process.env['VITE_SUPABASE_PUBLISHABLE_KEY'] ?? process.env['SUPABASE_PUBLISHABLE_KEY'];
const run = url && service && pub ? describe : describe.skip;

run("password reset flow", () => {
  const admin = createClient(url!, service!, { auth: { persistSession: false } });
  const email = `reset-test-${Date.now()}@example.com`;
  let userId = "";

  afterAll(async () => { if (userId) await admin.auth.admin.deleteUser(userId); });

  it("resets the password through the recovery link", async () => {
    const created = await admin.auth.admin.createUser({ email, password: "OldPass!12345", email_confirm: true });
    expect(created.error).toBeNull();
    userId = created.data.user!.id;

    // Same link the reset email contains, pointing at our /reset-password page.
    const link = await admin.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo: "https://quantra-market-whisperer.lovable.app/reset-password" } });
    expect(link.error).toBeNull();
    expect(link.data.properties?.redirect_to).toContain("/reset-password");

    const client = createClient(url!, pub!, { auth: { persistSession: false } });
    const v = await client.auth.verifyOtp({ type: "recovery", token_hash: link.data.properties!.hashed_token });
    expect(v.error).toBeNull();
    const upd = await client.auth.updateUser({ password: "NewPass!67890" });
    expect(upd.error).toBeNull();

    const fresh = () => createClient(url!, pub!, { auth: { persistSession: false } });
    expect((await fresh().auth.signInWithPassword({ email, password: "OldPass!12345" })).error).not.toBeNull();
    expect((await fresh().auth.signInWithPassword({ email, password: "NewPass!67890" })).error).toBeNull();

    // A used link can't be reused.
    const again = await fresh().auth.verifyOtp({ type: "recovery", token_hash: link.data.properties!.hashed_token });
    expect(again.error).not.toBeNull();
  }, 30_000);
});
