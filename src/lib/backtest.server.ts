import { analyze } from "./scanner.server";

export type BacktestInput = { symbol: string; years: number; entry: number; exit: number; stopLoss: number; takeProfit: number };

export async function runBacktest(inp: BacktestInput) {
  const sym = inp.symbol.trim().toUpperCase();
  if (!/^[A-Z0-9.\-^=]{1,15}$/.test(sym)) throw new Error("Invalid ticker");
  const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${inp.years}y&interval=1d`, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`No history for ${sym}`);
  const j = (await res.json()) as any;
  const r = j?.chart?.result?.[0];
  if (!r) throw new Error(`No history for ${sym}`);
  const ts: number[] = r.timestamp ?? [];
  const raw: (number | null)[] = r.indicators.quote[0].close;
  const days = ts.map((t, i) => ({ t: t * 1000, c: raw[i] })).filter((d): d is { t: number; c: number } => d.c != null && d.c > 0);
  const WARM = 70;
  if (days.length < WARM + 20) throw new Error("Not enough history for a backtest");
  const COST = 0.0005;
  let cash = 10000, shares = 0, entryPx = 0, entryT = 0, peak = 10000, maxDD = 0;
  const trades: { entry: number; exit: number; entryPx: number; exitPx: number; ret: number; reason: string }[] = [];
  const curve: { t: number; strat: number; hold: number; score: number }[] = [];
  const startPx = days[WARM]!.c;
  for (let i = WARM; i < days.length; i++) {
    const closes = days.slice(Math.max(0, i - 130), i + 1).map((d) => d.c);
    const { score } = analyze(closes);
    const px = days[i]!.c;
    if (shares > 0) {
      const ret = ((px - entryPx) / entryPx) * 100;
      const reason = ret <= -inp.stopLoss ? "Stop-loss" : ret >= inp.takeProfit ? "Take-profit" : score < inp.exit ? `Score ${score} < ${inp.exit}` : null;
      if (reason || i === days.length - 1) {
        const exitPx = px * (1 - COST);
        cash = shares * exitPx;
        trades.push({ entry: entryT, exit: days[i]!.t, entryPx, exitPx, ret: ((exitPx - entryPx) / entryPx) * 100, reason: reason ?? "End of test" });
        shares = 0;
      }
    } else if (score >= inp.entry && i < days.length - 1) {
      entryPx = px * (1 + COST); shares = cash / entryPx; cash = 0; entryT = days[i]!.t;
    }
    const eq = cash + shares * px;
    peak = Math.max(peak, eq);
    maxDD = Math.max(maxDD, ((peak - eq) / peak) * 100);
    curve.push({ t: days[i]!.t, strat: eq, hold: (10000 * px) / startPx, score });
  }
  const final = curve.at(-1)!;
  const yrs = (final.t - curve[0]!.t) / (365.25 * 86400_000);
  let hPeak = 0, holdDD = 0;
  for (const p of curve) { hPeak = Math.max(hPeak, p.hold); holdDD = Math.max(holdDD, ((hPeak - p.hold) / hPeak) * 100); }
  const wins = trades.filter((t) => t.ret > 0).length;
  const step = Math.max(1, Math.floor(curve.length / 300));
  return {
    symbol: sym,
    name: r.meta.longName ?? r.meta.shortName ?? sym,
    stats: {
      strategyReturn: (final.strat / 10000 - 1) * 100,
      holdReturn: (final.hold / 10000 - 1) * 100,
      strategyCagr: (Math.pow(final.strat / 10000, 1 / yrs) - 1) * 100,
      holdCagr: (Math.pow(final.hold / 10000, 1 / yrs) - 1) * 100,
      maxDrawdown: maxDD, holdDrawdown: holdDD,
      trades: trades.length, winRate: trades.length ? (wins / trades.length) * 100 : 0,
      avgTrade: trades.length ? trades.reduce((s, t) => s + t.ret, 0) / trades.length : 0,
      exposure: (curve.filter((_, i) => i > 0).length && trades.reduce((s, t) => s + (t.exit - t.entry), 0) / (final.t - curve[0]!.t)) * 100,
    },
    curve: curve.filter((_, i) => i % step === 0 || i === curve.length - 1),
    trades: trades.slice(-50).reverse(),
  };
}
