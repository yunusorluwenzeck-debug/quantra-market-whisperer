import universe from "./universe.server.json";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type U = [string, string, string, string | null, number | null];
const UNIVERSE = universe as U[];
const UA = { "User-Agent": "Mozilla/5.0" };

const SUFFIX_CCY: Record<string, string> = {
  L: "GBp", DE: "EUR", PA: "EUR", AS: "EUR", MC: "EUR", MI: "EUR", HE: "EUR", BR: "EUR", LS: "EUR", VI: "EUR", IR: "EUR",
  ST: "SEK", SW: "CHF", OL: "NOK", CO: "DKK",
};
export function currencyOf(symbol: string) {
  const m = /\.([A-Z]{1,3})$/.exec(symbol);
  return m ? (SUFFIX_CCY[m[1]!] ?? "USD") : "USD";
}

export async function fxRates(): Promise<Record<string, number>> {
  const pairs = ["GBP", "EUR", "SEK", "CHF", "NOK", "DKK"];
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/spark?symbols=${pairs.map((p) => `${p}USD=X`).join(",")}&range=5d&interval=1d`,
    { headers: UA },
  );
  if (!res.ok) throw new Error("FX unavailable");
  const j = (await res.json()) as Record<string, { close?: (number | null)[] }>;
  const out: Record<string, number> = { USD: 1 };
  for (const p of pairs) {
    const c = j[`${p}USD=X`]?.close?.filter((x): x is number => x != null).at(-1);
    if (!c) throw new Error(`FX ${p} missing`);
    out[p] = c;
  }
  out["GBp"] = out["GBP"]! / 100;
  return out;
}

const sma = (a: number[], n: number) => (a.length < n ? null : a.slice(-n).reduce((s, x) => s + x, 0) / n);
function rsi(c: number[], n = 14) {
  if (c.length <= n) return null;
  let g = 0, l = 0;
  for (let i = c.length - n; i < c.length; i++) {
    const d = c[i]! - c[i - 1]!;
    if (d > 0) g += d; else l -= d;
  }
  return l === 0 ? 100 : 100 - 100 / (1 + g / l);
}
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

export function analyze(closes: number[]) {
  const price = closes.at(-1)!;
  const prev = closes.at(-2) ?? price;
  const s20 = sma(closes, 20), s50 = sma(closes, 50);
  const r = rsi(closes);
  const m1 = closes.length > 21 ? ((price - closes.at(-22)!) / closes.at(-22)!) * 100 : null;
  const m3 = closes.length > 63 ? ((price - closes.at(-64)!) / closes.at(-64)!) * 100 : null;
  const rets = closes.slice(-60).map((c, i, a) => (i ? Math.log(c / a[i - 1]!) : 0)).slice(1);
  const mean = rets.reduce((s, x) => s + x, 0) / (rets.length || 1);
  const sd = Math.sqrt(rets.reduce((s, x) => s + (x - mean) ** 2, 0) / (rets.length || 1));
  const vol = rets.length > 10 ? sd * Math.sqrt(252) * 100 : null;

  let score = 50;
  if (s50 != null) { score += price > s50 ? 12 : -12; }
  if (s20 != null && s50 != null) score += s20 > s50 ? 8 : -8;
  if (s20 != null) score += price > s20 ? 5 : -5;
  if (m1 != null) score += (clamp(m1, -20, 20) / 20) * 12;
  if (m3 != null) score += (clamp(m3, -40, 40) / 40) * 13;
  if (r != null) {
    if (r >= 50 && r <= 70) score += 8;
    else if (r > 78) score -= 10;
    else if (r < 30) score += 4;
    else if (r < 45) score -= 4;
  }
  if (vol != null) { if (vol > 90) score -= 10; else if (vol < 30) score += 4; }
  score = Math.round(clamp(score, 0, 100));
  const signal = score >= 82 ? "STRONG BUY" : score >= 68 ? "BUY" : score <= 25 ? "STRONG SELL" : score <= 38 ? "SELL" : "HOLD";
  return { price, change_pct: ((price - prev) / prev) * 100, sma20: s20, sma50: s50, rsi14: r, mom_1m: m1, mom_3m: m3, volatility: vol, score, signal };
}

async function syncUniverse() {
  const { count } = await supabaseAdmin.from("stocks").select("symbol", { count: "exact", head: true });
  if ((count ?? 0) >= UNIVERSE.length) return 0;
  const rows = UNIVERSE.map(([symbol, name, cc, sector, mc]) => ({
    symbol, name, country: cc, region: cc === "US" ? "US" : "EU", sector, market_cap: mc, currency: currencyOf(symbol),
  }));
  for (let i = 0; i < rows.length; i += 1000) {
    const { error } = await supabaseAdmin.from("stocks").upsert(rows.slice(i, i + 1000), { onConflict: "symbol", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }
  return rows.length;
}

async function spark(symbols: string[]) {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/spark?symbols=${symbols.map(encodeURIComponent).join(",")}&range=6mo&interval=1d`,
    { headers: UA },
  );
  if (!res.ok) return {};
  return (await res.json()) as Record<string, { close?: (number | null)[] }>;
}

/** Re-scores the stalest `limit` stocks. Returns number updated. */
export async function runScan(limit = 760) {
  const seeded = await syncUniverse();
  const fx = await fxRates();
  const { data: due, error } = await supabaseAdmin
    .from("stocks").select("symbol, currency").order("updated_at", { ascending: true, nullsFirst: true }).limit(limit);
  if (error) throw new Error(error.message);
  const list = due ?? [];
  const batches: typeof list[] = [];
  for (let i = 0; i < list.length; i += 20) batches.push(list.slice(i, i + 20));
  const now = new Date().toISOString();
  const updates: Record<string, unknown>[] = [];
  for (let i = 0; i < batches.length; i += 8) {
    const results = await Promise.all(batches.slice(i, i + 8).map((b) => spark(b.map((x) => x.symbol)).catch(() => ({}))));
    results.forEach((res, k) => {
      for (const st of batches[i + k]!) {
        const closes = (res as Record<string, { close?: (number | null)[] }>)[st.symbol]?.close?.filter((x): x is number => x != null && x > 0) ?? [];
        if (closes.length < 5) { updates.push({ symbol: st.symbol, updated_at: now }); continue; }
        const a = analyze(closes);
        updates.push({
          symbol: st.symbol, ...a, price_usd: a.price * (fx[st.currency] ?? 1),
          spark: closes.slice(-30).map((c) => Math.round(c * 100) / 100), updated_at: now,
        });
      }
    });
  }
  // upsert requires all NOT NULL cols on insert path; rows exist so use update-by-upsert with names
  const names = new Map(UNIVERSE.map((u) => [u[0], u]));
  const rows = updates.map((u) => {
    const n = names.get(u.symbol as string);
    return { name: n?.[1] ?? (u.symbol as string), country: n?.[2] ?? "US", region: n?.[2] === "US" || !n ? "US" : "EU", ...u };
  });
  for (let i = 0; i < rows.length; i += 500) {
    const { error: e } = await supabaseAdmin.from("stocks").upsert(rows.slice(i, i + 500) as never, { onConflict: "symbol" });
    if (e) throw new Error(e.message);
  }
  await supabaseAdmin.from("job_runs").upsert({ job: "scan", last_run: now, info: `${rows.length} updated` });
  return { seeded, updated: rows.length };
}

export function marketOpen(region: string, d = new Date()) {
  const day = d.getUTCDay();
  if (day === 0 || day === 6) return false;
  const m = d.getUTCHours() * 60 + d.getUTCMinutes();
  return region === "US" ? m >= 13 * 60 + 30 && m < 20 * 60 : m >= 7 * 60 && m < 15 * 60 + 30;
}

/** Checks open price alerts against fresh prices (in each stock's own currency). */
export async function checkAlerts() {
  const { data: open } = await supabaseAdmin.from("price_alerts").select("id,symbol,direction,target").is("triggered_at", null).limit(2000);
  if (!open?.length) return 0;
  const syms = [...new Set(open.map((a) => a.symbol))].slice(0, 200);
  const prices: Record<string, number> = {};
  for (let i = 0; i < syms.length; i += 20) {
    const res = await spark(syms.slice(i, i + 20)).catch(() => ({}));
    for (const [k, v] of Object.entries(res as Record<string, { close?: (number | null)[] }>)) {
      const c = v?.close?.filter((x): x is number => x != null).at(-1);
      if (c) prices[k] = c;
    }
  }
  let hit = 0;
  const now = new Date().toISOString();
  for (const a of open) {
    const p = prices[a.symbol];
    if (p == null) continue;
    if ((a.direction === "above" && p >= Number(a.target)) || (a.direction === "below" && p <= Number(a.target))) {
      await supabaseAdmin.from("price_alerts").update({ triggered_at: now, triggered_price: p }).eq("id", a.id);
      hit++;
    }
  }
  return hit;
}
