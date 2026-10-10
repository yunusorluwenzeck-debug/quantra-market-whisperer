import { ACHIEVEMENTS, FUND_SYMBOLS, MISSIONS, type Facts } from "./progress";

// Correct option index per mission — server only.
export const ANSWERS: Record<string, number> = { diversify: 1, fees: 1, compound: 0, risk: 2 };

export function earnedCodes(f: Facts) {
  return ACHIEVEMENTS.filter((a) => a.test(f)).map((a) => a.code);
}

export function checkAnswer(code: string, answer: number) {
  const m = MISSIONS.find((x) => x.code === code);
  if (!m) return { ok: false as const, error: "Okänt uppdrag" };
  if (ANSWERS[code] !== answer) return { ok: false as const, error: "Fel svar — läs texten och försök igen." };
  return { ok: true as const, xp: m.xp };
}

// Reads the player's real data and records any newly earned achievements. Server-side only.
export async function syncAchievements(userId: string) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const [trades, sells, wins, pos, alerts, lists] = await Promise.all([
    db.from("paper_trades").select("id", { count: "exact", head: true }).eq("user_id", userId),
    db.from("paper_trades").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("side", "sell"),
    db.from("paper_trades").select("id", { count: "exact", head: true }).eq("user_id", userId).gt("realized_pnl", 0),
    db.from("paper_positions").select("symbol").eq("user_id", userId),
    db.from("price_alerts").select("id", { count: "exact", head: true }).eq("user_id", userId),
    db.from("stock_lists").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  const syms = (pos.data ?? []).map((p) => p.symbol);
  const facts: Facts = {
    trades: trades.count ?? 0, sells: sells.count ?? 0, profitableSells: wins.count ?? 0,
    holdings: syms.length, fundHoldings: syms.filter((s) => FUND_SYMBOLS.includes(s)).length,
    alerts: alerts.count ?? 0, lists: lists.count ?? 0,
  };
  const rows = earnedCodes(facts).map((code) => ({ user_id: userId, code, xp: ACHIEVEMENTS.find((a) => a.code === code)!.xp }));
  if (rows.length) await db.from("player_achievements").upsert(rows, { onConflict: "user_id,code", ignoreDuplicates: true });
}
