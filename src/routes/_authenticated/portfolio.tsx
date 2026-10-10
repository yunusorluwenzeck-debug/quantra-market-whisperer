import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resetPaperAccount } from "@/lib/trading.functions";
import { Card } from "@/components/AppShell";
import { fmt, signalClass, signed, tone, usd } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/portfolio")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Portfölj | StockLab" },
      { name: "description", content: "Följ dina virtuella innehav, kassa, vinst och förlust samt alla affärer." },
      { property: "og:title", content: "Portfölj | StockLab" },
      { property: "og:description", content: "Följ dina virtuella innehav, kassa, vinst och förlust samt alla affärer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Portfolio,
});

function Portfolio() {
  const qc = useQueryClient();
  const reset = useServerFn(resetPaperAccount);
  const { data } = useQuery({
    queryKey: ["portfolio"], refetchInterval: 60_000,
    queryFn: async () => {
      const [acc, pos, trades] = await Promise.all([
        supabase.from("paper_accounts").select("cash,starting_cash").maybeSingle(),
        supabase.from("paper_positions").select("symbol,qty,avg_cost,opened_at"),
        supabase.from("paper_trades").select("*").order("created_at", { ascending: false }).limit(100),
      ]);
      const syms = (pos.data ?? []).map((p) => p.symbol);
      const { data: st } = syms.length ? await supabase.from("stocks").select("symbol,name,price_usd,score,signal,change_pct").in("symbol", syms) : { data: [] };
      return { acc: acc.data, pos: pos.data ?? [], trades: trades.data ?? [], st: new Map((st ?? []).map((s) => [s.symbol, s])) };
    },
  });
  const cash = Number(data?.acc?.cash ?? 100000), start = Number(data?.acc?.starting_cash ?? 100000);
  const rows = (data?.pos ?? []).map((p) => {
    const s = data!.st.get(p.symbol);
    const px = Number(s?.price_usd ?? p.avg_cost);
    const value = Number(p.qty) * px;
    return { ...p, s, px, value, pnl: value - Number(p.qty) * Number(p.avg_cost), pnlPct: (px / Number(p.avg_cost) - 1) * 100 };
  });
  const invested = rows.reduce((t, r) => t + r.value, 0);
  const equity = cash + invested;
  const realized = (data?.trades ?? []).reduce((t, x) => t + Number(x.realized_pnl ?? 0), 0);
  const unreal = rows.reduce((t, r) => t + r.pnl, 0);
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Portfölj <span className="ml-2 rounded border border-border px-2 py-0.5 align-middle font-mono text-[10px] text-muted-foreground">SIMULERAD</span></h1>
          <p className="text-sm text-muted-foreground">Endast virtuella pengar. Belopp visas i kronor, omräknade med aktuell växelkurs.</p>
        </div>
        <button onClick={async () => { if (!confirm("Återställ kontot och radera alla innehav och affärer?")) return; const r = await reset(); if (!r.ok) { toast.error("error" in r ? r.error : "Återställningen misslyckades"); return; } qc.invalidateQueries(); toast.success("Kontot är återställt"); }} className="rounded-md border border-border px-3 py-1.5 font-mono text-xs hover:bg-accent">Återställ konto</button>
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-5">
        {[["Totalt värde", usd(equity), null], ["Total avkastning", signed((equity / start - 1) * 100), equity - start], ["Kassa", usd(cash), null], ["Orealiserat", usd(unreal), unreal], ["Realiserat", usd(realized), realized]].map(([k, v, n]) => (
          <div key={k as string} className="bg-card p-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
            <div className={`mt-1 font-mono text-xl font-semibold ${n == null ? "" : tone(n as number)}`}>{v}</div>
          </div>
        ))}
      </div>
      <Card title={`Innehav (${rows.length})`}>
        {!rows.length ? <p className="p-4 text-sm text-muted-foreground">Inga innehav än. Öppna en aktie för att köpa, eller slå på <Link to="/autopilot" className="text-primary underline">Autopilot</Link>.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead className="text-left text-[10px] uppercase text-muted-foreground"><tr className="border-b border-border"><th className="px-4 py-2">Aktie</th><th className="text-right">Antal</th><th className="text-right">Snittkurs</th><th className="text-right">Kurs</th><th className="text-right">Värde</th><th className="text-right">Resultat</th><th className="px-4">Signal</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.symbol} className="border-b border-border/50">
                    <td className="px-4 py-2"><Link to="/stock/$symbol" params={{ symbol: r.symbol }} className="font-semibold hover:text-primary">{r.symbol}</Link><div className="font-sans text-[11px] text-muted-foreground">{r.s?.name}</div></td>
                    <td className="text-right">{fmt(r.qty, 4)}</td><td className="text-right">{usd(r.avg_cost)}</td><td className="text-right">{usd(r.px)}</td>
                    <td className="text-right">{usd(r.value)}</td><td className={`text-right ${tone(r.pnl)}`}>{usd(r.pnl)} ({signed(r.pnlPct, 1)})</td>
                    <td className="px-4"><span className={`rounded border px-1.5 py-0.5 text-[10px] ${signalClass(r.s?.signal)}`}>{r.s?.signal ?? "—"} {r.s?.score}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card title="Transaktioner (simulerade)">
        {!data?.trades.length ? <p className="p-4 text-sm text-muted-foreground">Inga affärer än.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead className="text-left text-[10px] uppercase text-muted-foreground"><tr className="border-b border-border"><th className="px-4 py-2">Tid</th><th>Typ</th><th>Aktie</th><th className="text-right">Antal</th><th className="text-right">Kurs</th><th className="text-right">Realiserat</th><th className="px-4">Av / orsak</th></tr></thead>
              <tbody>
                {data.trades.map((t) => (
                  <tr key={t.id} className="border-b border-border/50 align-top">
                    <td className="whitespace-nowrap px-4 py-2">{new Date(t.created_at).toLocaleString("sv-SE")}</td>
                    <td className={t.side === "buy" ? "text-bull" : "text-bear"}>{t.side.toUpperCase()}</td>
                    <td>{t.symbol}</td><td className="text-right">{fmt(t.qty, 4)}</td><td className="text-right">{usd(t.price)}</td>
                    <td className={`text-right ${tone(t.realized_pnl)}`}>{t.realized_pnl == null ? "—" : usd(t.realized_pnl)}</td>
                    <td className="max-w-md px-4 font-sans text-[11px] text-muted-foreground"><span className="font-mono uppercase text-foreground">{t.source === "bot" ? "AI" : "Du"}</span> · {t.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
