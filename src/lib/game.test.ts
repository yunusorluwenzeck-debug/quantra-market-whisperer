import { describe, it, expect } from "vitest";
import { runChallenge, streakFrom, CHAPTER_ANSWERS } from "./game.server";
import { CHAPTERS, SCENARIOS } from "./game";

const ok = (r: ReturnType<typeof runChallenge>) => { if ("error" in r) throw new Error(r.error); return r; };

describe("Börsutmaningen scoring", () => {
  it("is deterministic", () => {
    const input = { scenarioId: "forsta-aret", weights: { global: 40, ranta: 30, sverige: 20, tech: 10 }, reaction: "hold" as const };
    expect(runChallenge(input)).toEqual(runChallenge(input));
  });
  it("does not reward reckless all-in risk", () => {
    for (const s of SCENARIOS) {
      const risky = s.assets.find((a) => a.risk === 5)!;
      const allIn = ok(runChallenge({ scenarioId: s.id, weights: { [risky.id]: 100 }, reaction: "allin" }));
      expect(allIn.passed).toBe(false);
    }
  });
  it("passes a diversified, calm portfolio", () => {
    const r = ok(runChallenge({ scenarioId: "forsta-aret", weights: { global: 40, ranta: 30, sverige: 20, tech: 10 }, reaction: "rebalance" }));
    expect(r.passed).toBe(true);
  });
  it("rejects allocations that do not sum to 100 or contain unknown assets", () => {
    expect(runChallenge({ scenarioId: "forsta-aret", weights: { global: 50 }, reaction: "hold" })).toHaveProperty("error");
    expect(runChallenge({ scenarioId: "forsta-aret", weights: { fake: 100 }, reaction: "hold" })).toHaveProperty("error");
  });
});

describe("tutorial", () => {
  it("has an answer for every chapter within its options", () => {
    for (const c of CHAPTERS) expect(CHAPTER_ANSWERS[c.n]).toBeLessThan(c.options.length);
  });
});

describe("streak", () => {
  it("counts consecutive days", () => {
    const now = new Date("2026-10-12T10:00:00Z");
    expect(streakFrom(["2026-10-12T08:00:00Z", "2026-10-11T08:00:00Z", "2026-10-10T08:00:00Z", "2026-10-07T08:00:00Z"], now)).toBe(3);
    expect(streakFrom([], now)).toBe(0);
  });
});
