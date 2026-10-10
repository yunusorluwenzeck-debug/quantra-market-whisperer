import { describe, expect, it, vi } from "vitest";
import { OAUTH_MAX_FAILS, recordOauthFailure } from "@/lib/oauth-guard.server";

function deps(recentCount: number) {
  return {
    now: () => 1_000_000,
    countRecent: vi.fn(async () => recentCount),
    log: vi.fn(async () => {}),
  };
}

describe("recordOauthFailure", () => {
  it("logs every failed attempt with provider and country", async () => {
    const d = deps(1);
    await recordOauthFailure("google", "SE", d);
    expect(d.log).toHaveBeenCalledWith("oauth_sign_in_failed", { provider: "google", country: "SE" });
  });

  it("does not flag below the threshold", async () => {
    const d = deps(OAUTH_MAX_FAILS - 1);
    const r = await recordOauthFailure("google", null, d);
    expect(r.suspicious).toBe(false);
    expect(d.log).not.toHaveBeenCalledWith("oauth_sign_in_suspicious", expect.anything());
  });

  it("flags suspicious activity at the threshold without sending email", async () => {
    const d = deps(OAUTH_MAX_FAILS);
    const r = await recordOauthFailure("google", "DE", d);
    expect(r.suspicious).toBe(true);
    expect(d.log).toHaveBeenCalledWith("oauth_sign_in_suspicious", expect.objectContaining({ provider: "google", count: OAUTH_MAX_FAILS }));
  });
});
