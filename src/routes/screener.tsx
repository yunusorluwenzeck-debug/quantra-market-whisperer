import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/AppShell";
import { ROW_COLS, StockTable, type Row } from "@/components/StockTable";
import { fmt } from "@/lib/format";

const search = z.object({
  q: z.string().optional(),
  region: z.enum(["ALL", "US", "EU"]).optional(),
  signal: z.string().optional(),
  minScore: z.number().optional(),
  minCap: z.number().optional(),
  sort: z.enum(["score", "change_pct", "mom_1m", "mom_3m", "market_cap"]).optional(),
  dir: z.enum(["asc", "desc"]).optional(),
  page: z.number().optional(),
});

export const Route = createFileRoute("/screener")({
  staticData: { sitemap: true },
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Aktier — 4 000+ amerikanska och europeiska aktier | StockLab" },
      { name: "description", content: "Filtrera och rangordna tusentals aktier efter poäng, momentum, RSI och börsvärde." },
      { property: "og:title", content: "Aktier — 4 000+ amerikanska och europeiska aktier | StockLab" },
      { property: "og:description", content: "Filtrera och rangordna tusentals aktier efter poäng, momentum, RSI och börsvärde." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Screener,
});

const PAGE = 50;
const SIGNALS = ["STRONG BUY", "BUY", "HOLD", "SELL", "STRONG SELL"];

function Screener() {
  const s = Route.useSearch();
  const nav = useNavigate({ from: "/screener" });
  const set = (patch: Partial<z.infer<typeof search>>) => nav({ search: (p) => ({ ...p, page: 0, ...patch }) });
  const [q, setQ] = useState(s.q ?? "");
  useEffect(() => { const t = setTimeout(() => { if ((s.q ?? "") !== q) set({ q: q || undefined }); }, 350); return () => clearTimeout(t); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const page = s.page ?? 0, sort = s.sort ?? "score", dir = s.dir ?? "desc";

  const { data, isFetching } = useQuery({
    queryKey: ["screener", s],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let qb = supabase.from("stocks").select(ROW_COLS, { count: "exact" });
      if (s.q) { const t = s.q.replace(/[%,()]/g, ""); qb = qb.or(`symbol.ilike.%${t}%,name.ilike.%${t}%`); }
      if (s.region && s.region !== "ALL") qb = qb.eq("region", s.region);
      if (s.signal) qb = qb.eq("signal", s.signal);
      if (s.minScore) qb = qb.gte("score", s.minScore);
      if (s.minCap) qb = qb.gte("market_cap", s.minCap);
      const { data, count, error } = await qb.order(sort, { ascending: dir === "asc", nullsFirst: false }).range(page * PAGE, page * PAGE + PAGE - 1);
      if (error) throw error;
      return { rows: (data ?? []) as Row[], count: count ?? 0 };
    },
  });
  const pages = Math.ceil((data?.count ?? 0) / PAGE);
  const sel = "rounded-md border border-input bg-card px-2 py-1.5 font-mono text-xs";
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-2xl font-bold">Aktier</h1>
        <p className="text-sm text-muted-foreground">{fmt(data?.count, 0)} matching companies across US and European exchanges.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sök namn eller ticker" className={`${sel} w-56`} />
        <select className={sel} value={s.region ?? "ALL"} onChange={(e) => set({ region: e.target.value as "ALL" })}>
          <option value="ALL">Alla marknader</option><option value="US">USA</option><option value="EU">Europa</option>
        </select>
        <select className={sel} value={s.signal ?? ""} onChange={(e) => set({ signal: e.target.value || undefined })}>
          <option value="">Alla signaler</option>{SIGNALS.map((x) => <option key={x}>{x}</option>)}
        </select>
        <select className={sel} value={s.minScore ?? 0} onChange={(e) => set({ minScore: Number(e.target.value) || undefined })}>
          <option value={0}>Alla poäng</option>{[50, 60, 70, 80, 90].map((x) => <option key={x} value={x}>Score ≥ {x}</option>)}
        </select>
        <select className={sel} value={s.minCap ?? 0} onChange={(e) => set({ minCap: Number(e.target.value) || undefined })}>
          <option value={0}>Alla storlekar</option><option value={1e9}>≥ $1B börsvärde</option><option value={1e10}>≥ $10B börsvärde</option><option value={1e11}>≥ $100B börsvärde</option>
        </select>
        <select className={sel} value={`${sort}:${dir}`} onChange={(e) => { const [a, b] = e.target.value.split(":"); set({ sort: a as "score", dir: b as "desc" }); }}>
          <option value="score:desc">Högst poäng</option><option value="score:asc">Lägst poäng</option>
          <option value="change_pct:desc">Dagens vinnare</option><option value="change_pct:asc">Dagens förlorare</option>
          <option value="mom_1m:desc">Momentum 1 mån</option><option value="mom_3m:desc">Momentum 3 mån</option><option value="market_cap:desc">Störst</option>
        </select>
        {isFetching && <span className="self-center font-mono text-xs text-muted-foreground">laddar…</span>}
      </div>
      <Card><StockTable rows={data?.rows ?? []} /></Card>
      <div className="flex items-center justify-center gap-3 font-mono text-xs">
        <button disabled={page <= 0} onClick={() => nav({ search: (p) => ({ ...p, page: page - 1 }) })} className="rounded border border-border px-3 py-1.5 disabled:opacity-40">Föregående</button>
        <span>Page {page + 1} / {Math.max(1, pages)}</span>
        <button disabled={page + 1 >= pages} onClick={() => nav({ search: (p) => ({ ...p, page: page + 1 }) })} className="rounded border border-border px-3 py-1.5 disabled:opacity-40">Nästa</button>
      </div>
    </div>
  );
}
