import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { runBotNow, saveBotSettings, setEmergencyStop } from "@/lib/trading.functions";
import { Card } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/autopilot")({
  head: () => ({
    meta: [
      { title: "AI Autopilot — automated paper trading | Quantra" },
      { name: "description", content: "Let the AI trade your paper portfolio within your risk limits, with a full decision log and emergency stop." },
      { property: "og:title", content: "AI Autopilot — automated paper trading | Quantra" },
      { property: "og:description", content: "Let the AI trade your paper portfolio within your risk limits, with a full decision log and emergency stop." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Autopilot,
});

const DEFAULTS = {
  enabled: false, regions: ["US", "EU"] as ("US" | "EU")[], blocked_symbols: [] as string[], min_score: 75, max_positions: 10, max_trade_usd: 10000,
  max_exposure_pct: 80, daily_loss_limit_pct: 3, max_drawdown_pct: 15, stop_loss_pct: 8, take_profit_pct: 20, market_hours_only: true,
};

function Autopilot() {
  const qc = useQueryClient();
  const save = useServerFn(saveBotSettings);
  const estop = useServerFn(setEmergencyStop);
  const runNow = useServerFn(runBotNow);
  const { data } = useQuery({
    queryKey: ["bot"], refetchInterval: 60_000,
    queryFn: async () => {
      const [s, ev] = await Promise.all([
        supabase.from("bot_settings").select("*").maybeSingle(),
        supabase.from("bot_events").select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      return { s: s.data, events: ev.data ?? [] };
    },
  });
  const [f, setF] = useState(DEFAULTS);
  const [blocked, setBlocked] = useState("");
  useEffect(() => {
    if (data?.s) {
      const s = data.s;
      setF({ ...DEFAULTS, ...Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, (s as Record<string, unknown>)[k]])) } as typeof DEFAULTS);
      setBlocked(s.blocked_symbols.join(", "));
    }
  }, [data?.s]);

  async function submit(enabledOverride?: boolean) {
    const enabled = enabledOverride ?? f.enabled;
    if (enabled && !data?.s?.enabled && !confirm("Authorize the AI to buy and sell automatically in your paper portfolio within these limits? No real money is used.")) return;
    const r = await save({ data: { ...f, enabled, max_trade_usd: Number(f.max_trade_usd), blocked_symbols: blocked.split(/[\s,]+/).map((x) => x.trim().toUpperCase()).filter(Boolean) } });
    if (!r.ok) { toast.error(r.error ?? "Save failed"); return; }
    toast.success("Settings saved");
    qc.invalidateQueries({ queryKey: ["bot"] });
  }
  const n = (k: keyof typeof DEFAULTS, label: string, hint?: string) => (
    <label className="grid gap-1 text-xs">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input type="number" step="any" value={f[k] as number} onChange={(e) => setF({ ...f, [k]: Number(e.target.value) })} className="rounded-md border border-input bg-background px-2 py-1.5 font-mono text-sm" />
      {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </label>
  );
  const s = data?.s;
  const status = !s?.enabled ? "OFF" : s.emergency_stop ? "EMERGENCY STOP" : s.paused_reason ? "PAUSED" : "ACTIVE";
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">AI Autopilot <span className="ml-2 rounded border border-border px-2 py-0.5 align-middle font-mono text-[10px] text-muted-foreground">PAPER TRADING</span></h1>
          <p className="max-w-2xl text-sm text-muted-foreground">Every 30 minutes the AI reviews the whole scanned universe, exits positions that hit stop-loss, take-profit or lose their signal, and buys the highest-scoring stocks — always within your limits. Every decision is logged with its reason.</p>
        </div>
        <button onClick={async () => { await estop({ data: { stop: !s?.emergency_stop } }); qc.invalidateQueries({ queryKey: ["bot"] }); }}
          className={`rounded-md px-5 py-3 font-mono text-sm font-bold ${s?.emergency_stop ? "border border-border" : "bg-bear text-background"}`}>
          {s?.emergency_stop ? "Release emergency stop" : "EMERGENCY STOP"}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4 font-mono text-sm">
        <span>Status: <b className={status === "ACTIVE" ? "text-bull" : status === "OFF" ? "text-muted-foreground" : "text-bear"}>{status}</b></span>
        {s?.paused_reason && <span className="text-bear">{s.paused_reason}</span>}
        <span className="text-muted-foreground">Last run: {s?.last_run ? new Date(s.last_run).toLocaleString() : "never"}</span>
        <button onClick={() => submit(!f.enabled)} className={`ml-auto rounded-md px-4 py-2 text-xs font-semibold ${f.enabled ? "border border-border" : "bg-primary text-primary-foreground"}`}>{f.enabled ? "Turn autopilot off" : "Turn autopilot on"}</button>
        <button disabled={!s?.enabled} onClick={async () => { const r = await runNow(); r.ok ? toast.success(`Run complete: ${r.trades ?? 0} trades${r.pause ? ` (paused: ${r.pause})` : ""}`) : toast.error(r.error ?? "Failed"); qc.invalidateQueries(); }} className="rounded-md border border-border px-4 py-2 text-xs disabled:opacity-40">Run now</button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card title="Strategy & risk limits">
          <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="grid gap-5 p-4">
            <div className="flex flex-wrap gap-4 text-sm">
              {(["US", "EU"] as const).map((r) => (
                <label key={r} className="flex items-center gap-2"><input type="checkbox" checked={f.regions.includes(r)} onChange={(e) => setF({ ...f, regions: e.target.checked ? [...f.regions, r] : f.regions.filter((x) => x !== r) })} />{r === "US" ? "US markets" : "European markets"}</label>
              ))}
              <label className="flex items-center gap-2"><input type="checkbox" checked={f.market_hours_only} onChange={(e) => setF({ ...f, market_hours_only: e.target.checked })} />Trade only during market hours</label>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {n("min_score", "Min score to buy", "50–100")}
              {n("max_positions", "Max positions")}
              {n("max_trade_usd", "Max $ per trade")}
              {n("max_exposure_pct", "Max exposure %", "Of total equity")}
              {n("daily_loss_limit_pct", "Daily loss limit %", "Pauses new buys")}
              {n("max_drawdown_pct", "Max drawdown %", "From peak equity")}
              {n("stop_loss_pct", "Stop-loss %")}
              {n("take_profit_pct", "Take-profit %")}
            </div>
            <label className="grid gap-1 text-xs"><span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Never trade these tickers</span>
              <input value={blocked} onChange={(e) => setBlocked(e.target.value)} placeholder="e.g. TSLA, GME" className="rounded-md border border-input bg-background px-2 py-1.5 font-mono text-sm" />
            </label>
            <button className="justify-self-start rounded-md bg-primary px-4 py-2 font-mono text-sm font-semibold text-primary-foreground">Save settings</button>
          </form>
        </Card>
        <Card title="Decision & event log">
          <ul className="max-h-[520px] divide-y divide-border overflow-y-auto">
            {!data?.events.length && <li className="p-4 text-sm text-muted-foreground">No events yet. Trades with their reasons appear in your portfolio history.</li>}
            {data?.events.map((e) => (
              <li key={e.id} className="p-3 text-xs">
                <div className="font-mono text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleString()} · {e.kind.toUpperCase()}</div>
                <div className={e.kind === "pause" || e.kind === "error" ? "text-bear" : ""}>{e.message}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <p className="text-xs text-muted-foreground">Real-money trading is not connected. Linking a broker account requires a compatible brokerage with an official trading API.</p>
    </div>
  );
}
