import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { marketOpen } from "./scanner.server";

const SLIPPAGE = 0.0005; // 0.05% modeled transaction cost per side
const STALE_MS = 6 * 3600_000;

async function event(user: string, kind: string, message: string) {
  await supabaseAdmin.from("bot_events").insert({ user_id: user, kind, message });
}
const pct = (x: number | null | undefined, d = 1) => (x == null ? "n/a" : `${x >= 0 ? "+" : ""}${Number(x).toFixed(d)}%`);

export async function runBotForUser(userId: string) {
  const { data: s } = await supabaseAdmin.from("bot_settings").select("*").eq("user_id", userId).maybeSingle();
  if (!s || !s.enabled || s.emergency_stop) return { skipped: true };
  await supabaseAdmin.from("paper_accounts").upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  const [{ data: acc }, { data: positions }, { data: scanJob }] = await Promise.all([
    supabaseAdmin.from("paper_accounts").select("*").eq("user_id", userId).single(),
    supabaseAdmin.from("paper_positions").select("*").eq("user_id", userId),
    supabaseAdmin.from("job_runs").select("last_run").eq("job", "scan").maybeSingle(),
  ]);
  const held = positions ?? [];
  const { data: heldStocks } = held.length
    ? await supabaseAdmin.from("stocks").select("symbol,region,price_usd,score,signal,updated_at").in("symbol", held.map((p) => p.symbol))
    : { data: [] as { symbol: string; region: string; price_usd: number | null; score: number | null; signal: string | null; updated_at: string | null }[] };
  const map = new Map((heldStocks ?? []).map((x) => [x.symbol, x]));
  const now = Date.now();
  let cash = Number(acc!.cash);
  const invested = held.reduce((t, p) => t + Number(p.qty) * Number(map.get(p.symbol)?.price_usd ?? p.avg_cost), 0);
  const equity = cash + invested;
  const today = new Date().toISOString().slice(0, 10);
  const dayStart = s.day_start_date === today && s.day_start_equity ? Number(s.day_start_equity) : equity;
  const peak = Math.max(Number(s.peak_equity ?? equity), equity);

  // Risk checks — pause new orders (exits still allowed).
  let pause: string | null = null;
  const dayPnl = ((equity - dayStart) / dayStart) * 100;
  const dd = ((peak - equity) / peak) * 100;
  if (dayPnl <= -Number(s.daily_loss_limit_pct)) pause = `Daily loss limit hit (${dayPnl.toFixed(2)}% today)`;
  else if (dd >= Number(s.max_drawdown_pct)) pause = `Max drawdown hit (${dd.toFixed(2)}% below peak)`;
  else if (!scanJob || now - new Date(scanJob.last_run).getTime() > 2 * 3600_000) pause = "Market data is not up to date";
  if (pause && pause !== s.paused_reason) await event(userId, "pause", `New orders paused: ${pause}`);
  if (!pause && s.paused_reason) await event(userId, "resume", "Risk checks passed again — new orders resumed");

  let trades = 0;
  // Exits
  for (const p of held) {
    const st = map.get(p.symbol);
    if (!st?.price_usd || !st.updated_at || now - new Date(st.updated_at).getTime() > STALE_MS) continue;
    if (s.market_hours_only && !marketOpen(st.region)) continue;
    const px = Number(st.price_usd) * (1 - SLIPPAGE);
    const ret = ((px - Number(p.avg_cost)) / Number(p.avg_cost)) * 100;
    let why: string | null = null;
    if (ret <= -Number(s.stop_loss_pct)) why = `Stop-loss: position ${pct(ret)} vs limit -${s.stop_loss_pct}%`;
    else if (ret >= Number(s.take_profit_pct)) why = `Take-profit: position ${pct(ret)} vs target +${s.take_profit_pct}%`;
    else if ((st.score ?? 50) < 40) why = `Score fell to ${st.score} (${st.signal}); position ${pct(ret)}`;
    if (!why) continue;
    const { error } = await supabaseAdmin.rpc("execute_paper_trade", { _user: userId, _symbol: p.symbol, _side: "sell", _qty: Number(p.qty), _price: px, _source: "bot", _reason: why });
    if (error) await event(userId, "error", `Sell ${p.symbol} failed: ${error.message}`);
    else { trades++; cash += Number(p.qty) * px; map.delete(p.symbol); }
  }

  // Entries
  if (!pause) {
    const heldNow = held.filter((p) => map.has(p.symbol)).map((p) => p.symbol);
    let slots = s.max_positions - heldNow.length;
    let investedNow = held.filter((p) => map.has(p.symbol)).reduce((t, p) => t + Number(p.qty) * Number(map.get(p.symbol)!.price_usd ?? p.avg_cost), 0);
    if (slots > 0) {
      const { data: cands } = await supabaseAdmin
        .from("stocks").select("symbol,name,region,price_usd,score,signal,mom_1m,mom_3m,rsi14,volatility,sma50,price,updated_at")
        .in("region", s.regions).gte("score", s.min_score).gt("price_usd", 1)
        .gte("updated_at", new Date(now - STALE_MS).toISOString())
        .order("score", { ascending: false }).limit(60);
      for (const c of cands ?? []) {
        if (slots <= 0) break;
        if (heldNow.includes(c.symbol) || s.blocked_symbols.includes(c.symbol)) continue;
        if (s.market_hours_only && !marketOpen(c.region)) continue;
        const exposureRoom = (equity * Number(s.max_exposure_pct)) / 100 - investedNow;
        const size = Math.min(Number(s.max_trade_usd), equity / s.max_positions, cash * 0.99, exposureRoom);
        if (size < 100) { if (exposureRoom < 100) await event(userId, "info", "Max portfolio exposure reached — no new buys"); break; }
        const px = Number(c.price_usd) * (1 + SLIPPAGE);
        const qty = Math.floor((size / px) * 10000) / 10000;
        if (qty <= 0) continue;
        const why = `Score ${c.score} (${c.signal}) — ${Number(c.price) > Number(c.sma50 ?? 0) ? "above" : "below"} 50-day avg, 1M ${pct(c.mom_1m)}, 3M ${pct(c.mom_3m)}, RSI ${c.rsi14 == null ? "n/a" : Number(c.rsi14).toFixed(0)}, volatility ${c.volatility == null ? "n/a" : Number(c.volatility).toFixed(0) + "%"}. Sized $${size.toFixed(0)} within per-trade, exposure and cash limits; est. cost ${(SLIPPAGE * 100).toFixed(2)}%.`;
        const { error } = await supabaseAdmin.rpc("execute_paper_trade", { _user: userId, _symbol: c.symbol, _side: "buy", _qty: qty, _price: px, _source: "bot", _reason: why });
        if (error) { await event(userId, "error", `Buy ${c.symbol} failed: ${error.message}`); continue; }
        trades++; slots--; cash -= qty * px; investedNow += qty * px; heldNow.push(c.symbol);
      }
    }
  }

  await supabaseAdmin.from("bot_settings").update({
    paused_reason: pause, peak_equity: peak, day_start_equity: dayStart, day_start_date: today, last_run: new Date().toISOString(),
  }).eq("user_id", userId);
  return { trades, pause };
}

export async function runAllBots() {
  const { data } = await supabaseAdmin.from("bot_settings").select("user_id").eq("enabled", true).eq("emergency_stop", false);
  let trades = 0;
  for (const r of data ?? []) {
    try { trades += (await runBotForUser(r.user_id)).trades ?? 0; } catch (e) { console.error("bot", r.user_id, e); }
  }
  return { users: data?.length ?? 0, trades };
}
