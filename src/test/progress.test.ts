import { describe, it, expect } from "vitest";
import { earnedCodes, checkAnswer } from "@/lib/progress.server";
import { levelOf, MISSIONS } from "@/lib/progress";
import { trackSave } from "@/lib/save-status";

const none = { trades: 0, sells: 0, profitableSells: 0, holdings: 0, fundHoldings: 0, alerts: 0, lists: 0 };

describe("XP and achievements", () => {
  it("awards nothing without activity", () => expect(earnedCodes(none)).toEqual([]));
  it("awards achievements from real facts only", () => {
    expect(earnedCodes({ ...none, trades: 1, holdings: 1, fundHoldings: 1 }).sort()).toEqual(["first_trade", "fund_owner"]);
  });
  it("computes levels", () => {
    expect(levelOf(0).level).toBe(1);
    expect(levelOf(100).level).toBe(2);
    expect(levelOf(299).level).toBe(2);
    expect(levelOf(300).level).toBe(3);
  });
  it("rejects wrong quiz answers and unknown missions", () => {
    expect(checkAnswer("fees", 0).ok).toBe(false);
    expect(checkAnswer("nope", 0).ok).toBe(false);
    expect(checkAnswer("fees", 1)).toEqual({ ok: true, xp: MISSIONS.find((m) => m.code === "fees")!.xp });
  });
});

describe("save status", () => {
  it("reports a lost connection as unconfirmed, never as success", async () => {
    const r = await trackSave(async () => { throw new Error("network"); });
    expect(r.ok).toBe(false);
    expect("network" in r).toBe(true);
  });
  it("passes through confirmed results", async () => {
    expect(await trackSave(async () => ({ ok: true }))).toEqual({ ok: true });
  });
});
