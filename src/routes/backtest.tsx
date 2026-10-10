import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { backtest } from "@/lib/trading.functions";
import { Card } from "@/components/AppShell";
import { fmt, signed, tone } from "@/lib/format";

export const Route = createFileRoute("/backtest")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Backtest the AI signal strategy | Quantra" },
      { name: "description", content: "Replay Quantra's quant signals on years of historical prices and compare against buy-and-hold." },
      { property: "og:title", content: "Backtest the AI signal strategy | Quantra" },
      { property: "og:description", content: "Replay Quantra's quant signals on years of historical prices and compare against buy-and-hold." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Backtest,
});

type Result = NonNullable<Awaited<ReturnType<typeof backtest>>["result"]>;

function Backtest() {
  const run = useServerFn(backtest);
  const [f, setF] = useState({ symbol: "AAPL", years: 5, entry: 70, exit: 45, stopLoss: 8, takeProfit: 25 });
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await run({ data: { ...f, symbol: f.symbol.toUpperCase() } });
    setBusy(false);
    if (r.error || !r.result) { setErr(r.error ?? "Failed"); setRes(null); } else setRes(r.result);
  }
  const num = (k: keyof typeof f, label: string) => (
    <label className="grid gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}
      <input type="number" value={f[k] as number} onChange={(e) => setF({ ...f, [k]: Number(e.target.value) })} className="w-24 rounded-md border border-input bg-background px-2 py-1.5 text-sm normal-case text-foreground" />
    </label>
  );
  const st = res?.stats;
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Backtest</h1>
        <p className="text-sm text-muted-foreground">Replays the exact scoring model the scanner uses, day by day on historical closes (no look-ahead), with 0.05% cost per trade. Starts with $10,000.</p>
      </div>
      <form onSubmit={go} className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <label className="grid gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Ticker
          <input value={f.symbol} onChange={(e) => setF({ ...f, symbol: e.target.value })} className="w-32 rounded-md border border-input bg-background px-2 py-1.5 text-sm uppercase text-foreground" />
        </label>
        {num("years", "Years")}{num("entry", "Buy score ≥")}{num("exit", "Sell score <")}{num("stopLoss", "Stop-loss %")}{num("takeProfit", "Take-profit %")}
        <button disabled={busy} className="rounded-md bg-primary px-4 py-2 font-mono text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Running…" : "Run backtest"}</button>
      </form>
      {err && <div className="text-sm text-bear">{err}</div>}
      {res && st && (
        <>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
            {[
              ["Strategy return", signed(st.strategyReturn, 1), st.strategyReturn],
              ["Buy & hold", signed(st.holdReturn, 1), st.holdReturn],
              ["Strategy CAGR", signed(st.strategyCagr, 1), st.strategyCagr],
              ["Hold CAGR", signed(st.holdCagr, 1), st.holdCagr],
              ["Max drawdown", `-${fmt(st.maxDrawdown, 1)}%`, -1],
              ["Hold drawdown", `-${fmt(st.holdDrawdown, 1)}%`, -1],
              ["Trades / win rate", `${st.trades} / ${fmt(st.winRate, 0)}%`, null],
              ["Avg trade", signed(st.avgTrade, 1), st.avgTrade],
            ].map(([k, v, n]) => (
              <div key={k as string} className="bg-card p-4">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
                <div className={`mt-1 font-mono text-xl font-semibold ${n == null ? "" : tone(n as number)}`}>{v}</div>
              </div>
            ))}
          </div>
          <Card title={`${res.name} — equity curve`}>
            <div className="h-80 p-4">
              <ResponsiveContainer>
                <LineChart data={res.curve.map((p) => ({ ...p, d: new Date(p.t).toLocaleDateString("en-US", { year: "2-digit", month: "short" }) }))}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="d" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} minTickGap={50} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={60} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} formatter={(v: number) => `$${fmt(v, 0)}`} />
                  <Legend />
                  <Line dataKey="strat" name="Signal strategy" stroke="var(--primary)" dot={false} strokeWidth={2} />
                  <Line dataKey="hold" name="Buy & hold" stroke="var(--muted-foreground)" dot={false} strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Trades (latest 50)">
            <table className="w-full font-mono text-xs">
              <thead className="text-left text-[10px] uppercase text-muted-foreground"><tr className="border-b border-border"><th className="px-4 py-2">Entry</th><th>Exit</th><th className="text-right">In</th><th className="text-right">Out</th><th className="text-right">Return</th><th className="px-4">Exit reason</th></tr></thead>
              <tbody>
                {res.trades.map((t) => (
                  <tr key={t.entry} className="border-b border-border/50">
                    <td className="px-4 py-1.5">{new Date(t.entry).toLocaleDateString()}</td><td>{new Date(t.exit).toLocaleDateString()}</td>
                    <td className="text-right">{fmt(t.entryPx)}</td><td className="text-right">{fmt(t.exitPx)}</td>
                    <td className={`text-right ${tone(t.ret)}`}>{signed(t.ret, 1)}</td><td className="px-4 text-muted-foreground">{t.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p className="text-xs text-muted-foreground">Past performance does not guarantee future results. Backtests ignore taxes, dividends and liquidity limits.</p>
        </>
      )}
    </div>
  );
}
