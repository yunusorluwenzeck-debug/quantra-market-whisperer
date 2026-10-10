import { Link } from "@tanstack/react-router";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { compact, fmt, signalClass, signed, tone } from "@/lib/format";

export type Row = {
  symbol: string; name: string; region: string; country: string; sector: string | null; market_cap: number | null; currency: string;
  price: number | null; change_pct: number | null; mom_1m: number | null; mom_3m: number | null; rsi14: number | null; score: number | null; signal: string | null; spark: unknown;
};
export const ROW_COLS = "symbol,name,region,country,sector,market_cap,currency,price,change_pct,mom_1m,mom_3m,rsi14,score,signal,spark";

export function Spark({ data, up }: { data: number[]; up: boolean }) {
  if (!data?.length) return null;
  return (
    <div className="h-7 w-24">
      <ResponsiveContainer>
        <LineChart data={data.map((v) => ({ v }))}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line dataKey="v" dot={false} strokeWidth={1.5} stroke={up ? "var(--bull)" : "var(--bear)"} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StockTable({ rows, compactMode = false }: { rows: Row[]; compactMode?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full font-mono text-xs">
        <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
          <tr className="border-b border-border">
            <th className="px-4 py-2">Aktie</th>
            {!compactMode && <th className="px-2 py-2">Marknad</th>}
            <th className="px-2 py-2 text-right">Kurs</th>
            <th className="px-2 py-2 text-right">Idag</th>
            {!compactMode && <th className="px-2 py-2 text-right">1M</th>}
            {!compactMode && <th className="px-2 py-2 text-right">3M</th>}
            {!compactMode && <th className="px-2 py-2 text-right">RSI</th>}
            {!compactMode && <th className="px-2 py-2 text-right">Börsvärde</th>}
            <th className="px-2 py-2">30d</th>
            <th className="px-2 py-2 text-right">Poäng</th>
            <th className="px-4 py-2">Signal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.symbol} className="border-b border-border/50 hover:bg-accent/50">
              <td className="max-w-[220px] px-4 py-2">
                <Link to="/stock/$symbol" params={{ symbol: r.symbol }} className="font-semibold hover:text-primary">{r.symbol}</Link>
                <div className="truncate font-sans text-[11px] text-muted-foreground">{r.name}</div>
              </td>
              {!compactMode && <td className="px-2 py-2 text-muted-foreground">{r.country}</td>}
              <td className="px-2 py-2 text-right">{fmt(r.price)} <span className="text-[10px] text-muted-foreground">{r.currency}</span></td>
              <td className={`px-2 py-2 text-right ${tone(r.change_pct)}`}>{signed(r.change_pct)}</td>
              {!compactMode && <td className={`px-2 py-2 text-right ${tone(r.mom_1m)}`}>{signed(r.mom_1m, 1)}</td>}
              {!compactMode && <td className={`px-2 py-2 text-right ${tone(r.mom_3m)}`}>{signed(r.mom_3m, 1)}</td>}
              {!compactMode && <td className="px-2 py-2 text-right">{fmt(r.rsi14, 0)}</td>}
              {!compactMode && <td className="px-2 py-2 text-right text-muted-foreground">{compact(r.market_cap)}</td>}
              <td className="px-2 py-1"><Spark data={(r.spark as number[]) ?? []} up={(r.mom_1m ?? 0) >= 0} /></td>
              <td className="px-2 py-2 text-right font-semibold">{r.score ?? "—"}</td>
              <td className="px-4 py-2"><span className={`whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] ${signalClass(r.signal)}`}>{r.signal ?? "pending"}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
