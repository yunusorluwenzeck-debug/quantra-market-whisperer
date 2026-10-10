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
      { title: "Historiktest av signalstrategin | StockLab" },
      { name: "description", content: "Testa StockLabs signaler på flera års historiska kurser och jämför med att köpa och behålla." },
      { property: "og:title", content: "Historiktest av signalstrategin | StockLab" },
      { property: "og:description", content: "Testa StockLabs signaler på flera års historiska kurser och jämför med att köpa och behålla." },
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
    if (r.error || !r.result) { setErr(r.error ?? "Misslyckades"); setRes(null); } else setRes(r.result);
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
        <h1 className="text-2xl font-bold">Historiktest</h1>
        <p className="text-sm text-muted-foreground">Kör samma poängmodell som skannern dag för dag på historiska stängningskurser (utan framtidsdata), med 0,05 % kostnad per affär. Startkapital 10 000 USD.</p>
      </div>
      <form onSubmit={go} className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <label className="grid gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Ticker
          <input value={f.symbol} onChange={(e) => setF({ ...f, symbol: e.target.value })} className="w-32 rounded-md border border-input bg-background px-2 py-1.5 text-sm uppercase text-foreground" />
        </label>
        {num("years", "År")}{num("entry", "Köp vid poäng ≥")}{num("exit", "Sälj vid poäng <")}{num("stopLoss", "Stop-loss %")}{num("takeProfit", "Vinstmål %")}
        <button disabled={busy} className="rounded-md bg-primary px-4 py-2 font-mono text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Kör…" : "Kör test"}</button>
      </form>
      {err && <div className="text-sm text-bear">{err}</div>}
      {res && st && (
        <>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
            {[
              ["Strategins avkastning", signed(st.strategyReturn, 1), st.strategyReturn],
              ["Köp och behåll", signed(st.holdReturn, 1), st.holdReturn],
              ["Strategins årstakt", signed(st.strategyCagr, 1), st.strategyCagr],
              ["Behåll årstakt", signed(st.holdCagr, 1), st.holdCagr],
              ["Största nedgång", `-${fmt(st.maxDrawdown, 1)}%`, -1],
              ["Behåll nedgång", `-${fmt(st.holdDrawdown, 1)}%`, -1],
              ["Affärer / träffsäkerhet", `${st.trades} / ${fmt(st.winRate, 0)}%`, null],
              ["Snittaffär", signed(st.avgTrade, 1), st.avgTrade],
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
                  <Line dataKey="strat" name="Signalstrategi" stroke="var(--primary)" dot={false} strokeWidth={2} />
                  <Line dataKey="hold" name="Köp och behåll" stroke="var(--muted-foreground)" dot={false} strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Affärer (senaste 50)">
            <table className="w-full font-mono text-xs">
              <thead className="text-left text-[10px] uppercase text-muted-foreground"><tr className="border-b border-border"><th className="px-4 py-2">Köp</th><th>Sälj</th><th className="text-right">In</th><th className="text-right">Ut</th><th className="text-right">Avkastning</th><th className="px-4">Säljorsak</th></tr></thead>
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
          <p className="text-xs text-muted-foreground">Historisk avkastning är ingen garanti för framtida avkastning. Testerna bortser från skatt, utdelningar och likviditet.</p>
        </>
      )}
    </div>
  );
}
