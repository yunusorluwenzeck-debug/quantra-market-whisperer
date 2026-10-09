import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Area, AreaChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getQuotes, getStock } from "@/lib/market.functions";

const WATCH = ["AAPL", "NVDA", "MSFT", "TSLA", "AMZN", "GOOGL", "META", "AMD"];
const RANGES = { "1M": 22, "3M": 66, "6M": 132, "1Y": 260 } as const;

const quotesQ = queryOptions({
  queryKey: ["quotes"],
  queryFn: () => getQuotes({ data: { symbols: WATCH } }),
  refetchInterval: 60_000,
});
const stockQ = (symbol: string) =>
  queryOptions({ queryKey: ["stock", symbol], queryFn: () => getStock({ data: { symbol } }), refetchInterval: 60_000 });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quantra — AI Stock Analysis & Predictions" },
      { name: "description", content: "Live stock prices, technical indicators and AI-generated price outlooks." },
      { property: "og:title", content: "Quantra — AI Stock Analysis & Predictions" },
      { property: "og:description", content: "Live stock prices, technical indicators and AI-generated price outlooks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const fmt = (n: number | null | undefined, d = 2) => (n == null ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }));
const tone = (n: number) => (n >= 0 ? "text-bull" : "text-bear");

function Index() {
  const [symbol, setSymbol] = useState("NVDA");
  const [search, setSearch] = useState("");
  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
            <span className="text-lg font-bold tracking-tight">QUANTRA</span>
            <span className="font-mono text-xs text-muted-foreground">/ AI market intelligence</span>
          </div>
          <form
            className="ml-auto"
            onSubmit={(e) => {
              e.preventDefault();
              if (search.trim()) setSymbol(search.trim().toUpperCase());
              setSearch("");
            }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ticker… e.g. NFLX"
              className="w-56 rounded-md border border-input bg-card px-3 py-2 font-mono text-sm uppercase outline-none placeholder:normal-case placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </form>
        </div>
      </header>
      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[260px_1fr]">
        <Watchlist active={symbol} onPick={setSymbol} />
        <StockPanel key={symbol} symbol={symbol} />
      </main>
    </div>
  );
}

function Watchlist({ active, onPick }: { active: string; onPick: (s: string) => void }) {
  const { data } = useQuery(quotesQ);
  return (
    <aside className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">Watchlist</div>
      <ul>
        {(data ?? WATCH.map((s) => ({ symbol: s, price: 0, changePct: 0, spark: [] as number[] }))).map((q) => (
          <li key={q.symbol}>
            <button
              onClick={() => onPick(q.symbol)}
              className={`flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition-colors hover:bg-accent ${active === q.symbol ? "border-primary bg-accent" : "border-transparent"}`}
            >
              <span className="w-14 font-mono text-sm font-semibold">{q.symbol}</span>
              <div className="h-8 flex-1">
                {q.spark.length > 0 && (
                  <ResponsiveContainer>
                    <LineChart data={q.spark.map((v) => ({ v }))}>
                      <YAxis hide domain={["dataMin", "dataMax"]} />
                      <Line dataKey="v" dot={false} strokeWidth={1.5} stroke={q.changePct >= 0 ? "var(--bull)" : "var(--bear)"} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="text-right font-mono text-xs">
                <div>{q.price ? fmt(q.price) : "…"}</div>
                <div className={tone(q.changePct)}>{q.price ? `${q.changePct >= 0 ? "+" : ""}${fmt(q.changePct)}%` : ""}</div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function StockPanel({ symbol }: { symbol: string }) {
  const { data, isLoading } = useQuery(stockQ(symbol));
  const [range, setRange] = useState<keyof typeof RANGES>("6M");
  if (isLoading) return <div className="animate-pulse rounded-lg border border-border bg-card p-10 font-mono text-sm text-muted-foreground">Loading {symbol}…</div>;
  if (!data?.stock) return <div className="rounded-lg border border-border bg-card p-10 text-bear">{data?.error ?? "Could not load data"}</div>;
  const s = data.stock;
  const pts = s.candles.slice(-RANGES[range]).map((c) => ({ d: new Date(c.t).toLocaleDateString("en-US", { month: "short", day: "numeric" }), c: c.c }));
  const up = pts.length > 1 && pts.at(-1)!.c >= pts[0]!.c;
  const ind = s.indicators;
  const stats = [
    ["SMA 20", fmt(ind.sma20)],
    ["SMA 50", fmt(ind.sma50)],
    ["RSI 14", fmt(ind.rsi14, 1)],
    ["Volatility", `${fmt(ind.volatility, 1)}%`],
    ["1M Momentum", `${fmt(ind.momentum1m)}%`],
    ["52W Range", `${fmt(ind.low52)} – ${fmt(ind.high52)}`],
  ];
  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="font-mono text-xs text-muted-foreground">{s.exchange} · {s.currency}</div>
            <h1 className="mt-1 text-2xl font-bold">{s.name} <span className="font-mono text-base text-muted-foreground">{s.symbol}</span></h1>
            <div className="mt-2 flex items-baseline gap-3 font-mono">
              <span className="text-4xl font-semibold">{fmt(s.price)}</span>
              <span className={`text-lg ${tone(s.change)}`}>{s.change >= 0 ? "+" : ""}{fmt(s.change)} ({fmt(s.changePct)}%)</span>
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
        <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
          {stats.map(([k, v]) => (
            <div key={k} className="bg-card p-3">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
              <div className="mt-1 font-mono text-sm">{v}</div>
            </div>
          ))}
        </div>
      </section>
      <AiPanel symbol={s.symbol} />
    </div>
  );
}

function AiPanel({ symbol }: { symbol: string }) {
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [err, setErr] = useState("");
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  async function run() {
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    setText(""); setErr(""); setState("loading");
    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol }), signal: ac.signal });
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

  return (
    <section className="rounded-lg border border-primary/30 bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-primary">AI Prediction Engine</div>
          <p className="mt-1 text-sm text-muted-foreground">Signal, price outlook and key levels for {symbol}, from live technical data.</p>
        </div>
        {state === "loading" ? (
          <button onClick={() => abort.current?.abort()} className="rounded-md border border-border px-4 py-2 font-mono text-sm hover:bg-accent">Stop</button>
        ) : (
          <button onClick={run} className="rounded-md bg-primary px-4 py-2 font-mono text-sm font-semibold text-primary-foreground hover:opacity-90">
            {state === "done" ? "Re-run analysis" : "Run AI analysis"}
          </button>
        )}
      </div>
      {state === "loading" && !text && <div className="mt-6 animate-pulse font-mono text-sm text-muted-foreground">Analyzing market structure…</div>}
      {state === "error" && <div className="mt-6 text-sm text-bear">{err}</div>}
      {text && <div className="prose-ai mt-4"><ReactMarkdown>{text}</ReactMarkdown></div>}
    </section>
  );
}
