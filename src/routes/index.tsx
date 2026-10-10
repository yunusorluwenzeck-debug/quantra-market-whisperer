import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/AppShell";
import { ROW_COLS, StockTable, type Row } from "@/components/StockTable";
import { fmt, signalClass } from "@/lib/format";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "StockLab — Översikt över 4 000+ aktier" },
      { name: "description", content: "Poängsätter tusentals amerikanska och europeiska aktier, skriver AI-rapporter om toppvalen och kör en autopilot med virtuella pengar." },
      { property: "og:title", content: "StockLab — Översikt över 4 000+ aktier" },
      { property: "og:description", content: "Poängsätter tusentals amerikanska och europeiska aktier, skriver AI-rapporter om toppvalen och kör en autopilot med virtuella pengar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["market-stats"], refetchInterval: 120_000,
    queryFn: async () => {
      const head = { count: "exact" as const, head: true };
      const [all, scored, buys, sells, job] = await Promise.all([
        supabase.from("stocks").select("symbol", head),
        supabase.from("stocks").select("symbol", head).not("score", "is", null),
        supabase.from("stocks").select("symbol", head).gte("score", 68),
        supabase.from("stocks").select("symbol", head).lte("score", 38),
        supabase.rpc("last_scan_time"),
      ]);
      return { all: all.count ?? 0, scored: scored.count ?? 0, buys: buys.count ?? 0, sells: sells.count ?? 0, last: (job.data as string | null) ?? undefined };
    },
  });
  const top = (region: string) => ({
    queryKey: ["top", region], refetchInterval: 120_000,
    queryFn: async () => (await supabase.from("stocks").select(ROW_COLS).eq("region", region).not("score", "is", null).gte("market_cap", 1e9).order("score", { ascending: false }).limit(10)).data as Row[] ?? [],
  });
  const { data: us } = useQuery(top("US"));
  const { data: eu } = useQuery(top("EU"));
  const { data: reports } = useQuery({
    queryKey: ["reports"], refetchInterval: 300_000,
    queryFn: async () => (await supabase.from("ai_reports").select("id,symbol,signal,score,content,created_at").order("created_at", { ascending: false }).limit(6)).data ?? [],
  });

  const tiles = [
    ["Bevakade bolag", fmt(stats?.all, 0)],
    ["Poängsatta", fmt(stats?.scored, 0)],
    ["Köpsignaler", fmt(stats?.buys, 0)],
    ["Säljsignaler", fmt(stats?.sells, 0)],
    ["Senaste skanning", stats?.last ? new Date(stats.last).toLocaleTimeString() : "—"],
  ];
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Marknadsöversikt</h1>
        <p className="mt-1 text-sm text-muted-foreground">Alla bolag i vårt amerikanska och europeiska urval poängsätts dygnet runt utifrån trend, momentum, RSI och volatilitet. AI:n skriver fördjupade rapporter om de starkaste lägena.</p>
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-5">
        {tiles.map(([k, v]) => (
          <div key={k} className="bg-card p-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
            <div className="mt-1 font-mono text-xl font-semibold">{v}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Toppval · USA" right={<Link to="/screener" search={{ region: "US" }} className="font-mono text-xs text-primary">Alla →</Link>}><StockTable rows={us ?? []} compactMode /></Card>
        <Card title="Toppval · Europa" right={<Link to="/screener" search={{ region: "EU" }} className="font-mono text-xs text-primary">Alla →</Link>}><StockTable rows={eu ?? []} compactMode /></Card>
      </div>
      <Card title="Senaste AI-rapporterna om toppval">
        {!reports?.length ? (
          <p className="p-4 text-sm text-muted-foreground">Rapporter skapas automatiskt med några timmars mellanrum för aktierna med högst poäng.</p>
        ) : (
          <div className="grid gap-px bg-border md:grid-cols-2 lg:grid-cols-3">
            {reports.map((r) => (
              <article key={r.id} className="bg-card p-4">
                <div className="flex items-center justify-between">
                  <Link to="/stock/$symbol" params={{ symbol: r.symbol }} className="font-mono font-semibold hover:text-primary">{r.symbol}</Link>
                  <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${signalClass(r.signal)}`}>{r.signal} · {r.score}</span>
                </div>
                <div className="prose-ai mt-2 max-h-56 overflow-hidden text-xs"><ReactMarkdown>{r.content}</ReactMarkdown></div>
                <div className="mt-2 font-mono text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
