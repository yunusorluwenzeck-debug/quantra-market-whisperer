import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getStock } from "@/lib/market.functions";
import { placeOrder } from "@/lib/trading.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fmt, signalClass, tone, usd } from "@/lib/format";

const RANGES = { "1M": 22, "3M": 66, "6M": 132, "1Y": 260 } as const;

export function StockDetail({ symbol }: { symbol: string }) {
  const { data, isLoading } = useQuery({ queryKey: ["stock", symbol], queryFn: () => getStock({ data: { symbol } }), refetchInterval: 60_000 });
  const { data: row } = useQuery({
    queryKey: ["stock-row", symbol],
    queryFn: async () => (await supabase.from("stocks").select("score,signal,region,sector,market_cap,price_usd").eq("symbol", symbol).maybeSingle()).data,
  });
  const [range, setRange] = useState<keyof typeof RANGES>("6M");
  if (isLoading) return <div className="animate-pulse rounded-lg border border-border bg-card p-10 font-mono text-sm text-muted-foreground">Loading {symbol}…</div>;
  if (!data?.stock) return <div className="rounded-lg border border-border bg-card p-10 text-bear">{data?.error ?? "Could not load data"}</div>;
  const s = data.stock;
  const pts = s.candles.slice(-RANGES[range]).map((c) => ({ d: new Date(c.t).toLocaleDateString("en-US", { month: "short", day: "numeric" }), c: c.c }));
  const up = pts.length > 1 && pts.at(-1)!.c >= pts[0]!.c;
  const ind = s.indicators;
  const stats = [
    ["Quant score", row?.score != null ? `${row.score}/100` : "—"],
    ["SMA 20", fmt(ind.sma20)], ["SMA 50", fmt(ind.sma50)], ["RSI 14", fmt(ind.rsi14, 1)],
    ["Volatility", `${fmt(ind.volatility, 1)}%`], ["1M Momentum", `${fmt(ind.momentum1m)}%`],
    ["52W Range", `${fmt(ind.low52)} – ${fmt(ind.high52)}`], ["Sector", row?.sector ?? "—"],
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="grid gap-6">
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="font-mono text-xs text-muted-foreground">{s.exchange} · {s.currency}</div>
              <h1 className="mt-1 text-2xl font-bold">{s.name} <span className="font-mono text-base text-muted-foreground">{s.symbol}</span></h1>
              <div className="mt-2 flex flex-wrap items-baseline gap-3 font-mono">
                <span className="text-4xl font-semibold">{fmt(s.price)}</span>
                <span className={`text-lg ${tone(s.change)}`}>{s.change >= 0 ? "+" : ""}{fmt(s.change)} ({fmt(s.changePct)}%)</span>
                {row?.signal && <span className={`rounded border px-2 py-0.5 text-xs ${signalClass(row.signal)}`}>{row.signal}</span>}
              </div>
            </div>
            <div className="flex gap-1 rounded-md bg-muted p-1 font-mono text-xs">
              {(Object.keys(RANGES) as (keyof typeof RANGES)[]).map((r) => (
                <button key={r} onClick={() => setRange(r)} className={`rounded px-3 py-1.5 ${range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{r}</button>
              ))}
            </div>
          </div>
          <div className="mt-6 h-72">
            <ResponsiveContainer>
              <AreaChart data={pts}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={up ? "var(--bull)" : "var(--bear)"} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={up ? "var(--bull)" : "var(--bear)"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="d" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={40} />
                <YAxis domain={["auto", "auto"]} orientation="right" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontFamily: "var(--font-mono)" }} formatter={(v: number) => [fmt(v), "Close"]} />
                <Area dataKey="c" type="monotone" stroke={up ? "var(--bull)" : "var(--bear)"} strokeWidth={2} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-4">
            {stats.map(([k, v]) => (
              <div key={k} className="bg-card p-3">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
                <div className="mt-1 truncate font-mono text-sm">{v}</div>
              </div>
            ))}
          </div>
        </section>
        <AiPanel symbol={s.symbol} />
      </div>
      <div className="grid content-start gap-6">
        <TradeBox symbol={s.symbol} priceUsd={row?.price_usd ?? null} currency={s.currency} />
        <ListAndAlert symbol={s.symbol} price={s.price} currency={s.currency} />
      </div>
    </div>
  );
}

function SignInCta({ what }: { what: string }) {
  return <Link to="/auth" className="block rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground hover:text-foreground">Sign in to {what}</Link>;
}

function TradeBox({ symbol, priceUsd, currency }: { symbol: string; priceUsd: number | null; currency: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const order = useServerFn(placeOrder);
  const [amt, setAmt] = useState("1000");
  const [busy, setBusy] = useState(false);
  const { data: pos } = useQuery({
    queryKey: ["position", symbol, user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("paper_positions").select("qty,avg_cost").eq("symbol", symbol).maybeSingle()).data,
  });
  const { data: acc } = useQuery({
    queryKey: ["account", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("paper_accounts").select("cash").maybeSingle()).data,
  });
  async function go(side: "buy" | "sell") {
    setBusy(true);
    const r = await order({ data: { clientKey: crypto.randomUUID(), ...(side === "sell" && pos && Number(amt) <= 0 ? { symbol, side, qty: Number(pos.qty) } : { symbol, side, amountUsd: Number(amt) }) } });
    setBusy(false);
    if (!r.ok) { toast.error(r.error ?? "Order failed"); return; }
    toast.success(`Simulated ${side} of ${fmt(r.qty, 4)} ${symbol} @ ${usd(r.price)}`);
    qc.invalidateQueries();
  }
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Paper trade</div>
      {!user ? <div className="mt-3"><SignInCta what="place simulated trades" /></div> : (
        <div className="mt-3 grid gap-3 text-sm">
          <div className="flex justify-between font-mono text-xs text-muted-foreground"><span>Cash</span><span>{usd(acc?.cash ?? 100000)}</span></div>
          <div className="flex justify-between font-mono text-xs text-muted-foreground"><span>Held</span><span>{pos ? `${fmt(pos.qty, 4)} @ ${usd(pos.avg_cost)}` : "—"}</span></div>
          {currency !== "USD" && <div className="font-mono text-[10px] text-muted-foreground">Priced in USD at ≈ {usd(priceUsd)} (converted from {currency})</div>}
          <label className="grid gap-1 font-mono text-xs">Amount (USD)
            <input value={amt} onChange={(e) => setAmt(e.target.value)} inputMode="decimal" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button disabled={busy} onClick={() => go("buy")} className="rounded-md bg-bull py-2 font-mono text-sm font-semibold text-background disabled:opacity-50">Buy</button>
            <button disabled={busy || !pos} onClick={() => go("sell")} className="rounded-md bg-bear py-2 font-mono text-sm font-semibold text-background disabled:opacity-50">Sell</button>
          </div>
          {pos && <button disabled={busy} onClick={() => { setAmt("0"); void order({ data: { clientKey: crypto.randomUUID(), symbol, side: "sell", qty: Number(pos.qty) } }).then((r) => { r.ok ? toast.success("Position closed") : toast.error(r.error ?? "Failed"); qc.invalidateQueries(); }); }} className="font-mono text-xs text-muted-foreground hover:text-foreground">Close entire position</button>}
        </div>
      )}
    </section>
  );
}

function ListAndAlert({ symbol, price, currency }: { symbol: string; price: number; currency: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [target, setTarget] = useState(() => (price * 1.05).toFixed(2));
  const [dir, setDir] = useState<"above" | "below">("above");
  const { data: lists } = useQuery({
    queryKey: ["lists", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("stock_lists").select("id,name,symbols").order("created_at")).data ?? [],
  });
  if (!user) return <section className="rounded-lg border border-border bg-card p-4"><SignInCta what="save to lists and set price alerts" /></section>;
  async function toggle(l: { id: string; symbols: string[] }) {
    const has = l.symbols.includes(symbol);
    const { error } = await supabase.from("stock_lists").update({ symbols: has ? l.symbols.filter((x) => x !== symbol) : [...l.symbols, symbol] }).eq("id", l.id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["lists"] });
  }
  async function addAlert() {
    const t = Number(target);
    if (!(t > 0)) { toast.error("Enter a target price"); return; }
    const { error } = await supabase.from("price_alerts").insert({ symbol, direction: dir, target: t });
    if (error) toast.error(error.message); else { toast.success(`Alert set: ${symbol} ${dir} ${fmt(t)} ${currency}`); qc.invalidateQueries({ queryKey: ["alerts"] }); }
  }
  return (
    <section className="grid gap-4 rounded-lg border border-border bg-card p-4">
      <div>
        <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Lists</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {(lists ?? []).map((l) => (
            <button key={l.id} onClick={() => toggle(l)} className={`rounded border px-2 py-1 font-mono text-xs ${l.symbols.includes(symbol) ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
              {l.symbols.includes(symbol) ? "✓ " : "+ "}{l.name}
            </button>
          ))}
          <Link to="/lists" className="px-1 py-1 font-mono text-xs text-muted-foreground underline">Manage</Link>
        </div>
      </div>
      <div>
        <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Price alert ({currency})</div>
        <div className="mt-2 flex gap-2">
          <select value={dir} onChange={(e) => setDir(e.target.value as "above" | "below")} className="rounded-md border border-input bg-background px-2 text-xs">
            <option value="above">Above</option><option value="below">Below</option>
          </select>
          <input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" className="w-full rounded-md border border-input bg-background px-2 py-1.5 font-mono text-sm" />
          <button onClick={addAlert} className="rounded-md bg-primary px-3 font-mono text-xs font-semibold text-primary-foreground">Set</button>
        </div>
      </div>
    </section>
  );
}

function AiPanel({ symbol }: { symbol: string }) {
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [err, setErr] = useState("");
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  const { data: saved } = useQuery({
    queryKey: ["report", symbol],
    queryFn: async () => (await supabase.from("ai_reports").select("content,created_at").eq("symbol", symbol).order("created_at", { ascending: false }).limit(1).maybeSingle()).data,
  });

  async function run() {
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    setText(""); setErr(""); setState("loading");
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) throw new Error("Sign in to run AI analysis.");
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session.access_token}` }, body: JSON.stringify({ symbol }), signal: ac.signal });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? (res.status === 429 ? "Too many requests, try again shortly." : res.status === 402 ? "AI credits exhausted." : "Analysis failed"));
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setText(acc);
      }
      if (!acc.trim()) throw new Error("The AI returned no analysis. Please try again later.");
      setState("done");
    } catch (e) {
      if (ac.signal.aborted) { setState("idle"); return; }
      setErr(e instanceof Error ? e.message : "Analysis failed");
      setState("error");
    }
  }
  const shown = text || (state === "idle" && saved?.content) || "";
  return (
    <section className="rounded-lg border border-primary/30 bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-primary">AI Prediction Engine</div>
          <p className="mt-1 text-sm text-muted-foreground">
            {!text && saved ? `Saved report from ${new Date(saved.created_at).toLocaleString()}.` : `Signal, price outlook and key levels for ${symbol}, from live technical data.`}
          </p>
        </div>
        {state === "loading" ? (
          <button onClick={() => abort.current?.abort()} className="rounded-md border border-border px-4 py-2 font-mono text-sm hover:bg-accent">Stop</button>
        ) : (
          <button onClick={run} className="rounded-md bg-primary px-4 py-2 font-mono text-sm font-semibold text-primary-foreground hover:opacity-90">
            {state === "done" || saved ? "Run fresh analysis" : "Run AI analysis"}
          </button>
        )}
      </div>
      {state === "loading" && !text && <div className="mt-6 animate-pulse font-mono text-sm text-muted-foreground">Analyzing market structure…</div>}
      {state === "error" && <div className="mt-6 text-sm text-bear">{err}</div>}
      {shown && <div className="prose-ai mt-4"><ReactMarkdown>{shown}</ReactMarkdown></div>}
    </section>
  );
}
