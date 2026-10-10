import { describe, it, expect } from "vitest";
import { LIMITS } from "@/lib/security.server";
describe("rate limits", () => {
  it("has a positive hourly cap for every sensitive action", () => {
    for (const v of Object.values(LIMITS)) expect(v).toBeGreaterThan(0);
  });
});
