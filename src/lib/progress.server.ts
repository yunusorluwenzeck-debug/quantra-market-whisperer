import { ACHIEVEMENTS, FUND_SYMBOLS, MISSIONS, PERIODIC, type Facts } from "./progress";

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

// ---- Daily / weekly missions (server-verified; stored in player_missions as "d:<day>:<id>" / "w:<week>:<id>") ----

const QUIZ: { q: string; options: string[]; answer: number }[] = [
  { q: "Vad är en indexfond?", options: ["En fond som följer ett helt index", "En fond med en enda aktie", "Ett sparkonto"], answer: 0 },
  { q: "Vad händer oftast med risken när du sprider pengarna på fler bolag?", options: ["Den ökar", "Den minskar", "Den blir noll"], answer: 1 },
  { q: "Vad betyder en årlig avgift på 1 %?", options: ["1 kr per affär", "1 % av värdet dras varje år", "1 % av vinsten en gång"], answer: 1 },
  { q: "Vilket är ofta mest riskfyllt?", options: ["Räntefond", "Global indexfond", "En enskild småbolagsaktie"], answer: 2 },
  { q: "Vad är ränta på ränta?", options: ["Avkastning på tidigare avkastning", "En bankavgift", "En skatt"], answer: 0 },
  { q: "Vad mäter volatilitet?", options: ["Hur mycket priset svänger", "Bolagets vinst", "Utdelningen"], answer: 0 },
  { q: "Varför kan det kosta att handla mycket?", options: ["Courtage och sämre beslut", "Det är alltid gratis", "Banken ger bonus"], answer: 0 },
];

const sthlm = (d: Date) => new Date(d.toLocaleString("en-US", { timeZone: "Europe/Stockholm" }));
export function periodKeys(now = new Date()) {
  const s = sthlm(now);
  const day = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(s.getDate()).padStart(2, "0")}`;
  const monday = new Date(s); monday.setDate(s.getDate() - ((s.getDay() + 6) % 7)); monday.setHours(0, 0, 0, 0);
  const week = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
  const offset = s.getTime() - now.getTime(); // Stockholm wall-clock minus UTC
  const dayStart = new Date(new Date(s).setHours(0, 0, 0, 0) - offset).toISOString();
  const weekStart = new Date(monday.getTime() - offset).toISOString();
  return { day, week, dayStart, weekStart };
}
export function todaysQuiz(day: string) {
  const n = Math.floor(Date.parse(day) / 86_400_000);
  const q = QUIZ[n % QUIZ.length]!;
  return { q: q.q, options: q.options, answer: q.answer };
}
export const periodicCode = (id: string, keys: { day: string; week: string }) => {
  const m = PERIODIC.find((x) => x.id === id)!;
  return m.period === "daily" ? `d:${keys.day}:${id}` : `w:${keys.week}:${id}`;
};

/** Checks the player's real data for each periodic mission. */
export async function periodicStatus(userId: string, now = new Date()) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const k = periodKeys(now);
  const [tDay, tWeek, al, pos, done] = await Promise.all([
    db.from("paper_trades").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", k.dayStart),
    db.from("paper_trades").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", k.weekStart),
    db.from("price_alerts").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", k.dayStart),
    db.from("paper_positions").select("symbol").eq("user_id", userId),
    db.from("player_missions").select("code").eq("user_id", userId).or(`code.like.d:%,code.like.w:${k.week}:%`),
  ]);
  const claimed = new Set((done.data ?? []).map((r) => r.code));
  const weekDays = new Set<string>();
  for (const c of claimed) { const [, d, id] = c.split(":"); if (c.startsWith("d:") && id === "quiz" && d! >= k.week) weekDays.add(d!); }
  const syms = (pos.data ?? []).map((p) => p.symbol);
  const tw = tWeek.count ?? 0;
  const met: Record<string, boolean> = {
    quiz: false, trade: (tDay.count ?? 0) >= 1, alert: (al.count ?? 0) >= 1,
    spread: syms.length >= 3, fund: syms.some((s) => FUND_SYMBOLS.includes(s)), calm: tw >= 1 && tw <= 10, quiz5: weekDays.size >= 3,
  };
  const progressText: Record<string, string> = { calm: `${tw} affärer`, quiz5: `${weekDays.size}/3 dagar`, spread: `${syms.length}/3 innehav` };
  return { keys: k, claimed, met, progressText };
}
