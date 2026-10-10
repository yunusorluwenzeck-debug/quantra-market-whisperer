import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/AppShell";
import { fmt } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/alerts")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Kurslarm | StockLab" },
      { name: "description", content: "Få besked när en aktie når ditt målpris." },
      { property: "og:title", content: "Kurslarm | StockLab" },
      { property: "og:description", content: "Få besked när en aktie når ditt målpris." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Alerts,
});

function Alerts() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["alerts"], refetchInterval: 60_000,
    queryFn: async () => (await supabase.from("price_alerts").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const fired = data?.filter((a) => a.triggered_at) ?? [];
  const open = data?.filter((a) => !a.triggered_at) ?? [];
  useEffect(() => {
    const unseen = fired.filter((a) => !a.seen).map((a) => a.id);
    if (unseen.length) void supabase.from("price_alerts").update({ seen: true }).in("id", unseen).then(() => qc.invalidateQueries({ queryKey: ["alerts-unseen"] }));
  }, [fired.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const del = async (id: string) => { await supabase.from("price_alerts").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["alerts"] }); };
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Kurslarm</h1>
        <p className="text-sm text-muted-foreground">Sätt larm från en aktiesida. Kurserna kontrolleras ungefär var 15:e minut, i aktiens egen valuta.</p>
      </div>
      <Card title={`Utlösta (${fired.length})`}>
        {!fired.length ? <p className="p-4 text-sm text-muted-foreground">Inga larm har utlösts än.</p> : (
          <ul className="divide-y divide-border">
            {fired.map((a) => (
              <li key={a.id} className={`flex items-center gap-4 px-4 py-3 font-mono text-sm ${!a.seen ? "bg-primary/10" : ""}`}>
                <Link to="/stock/$symbol" params={{ symbol: a.symbol }} className="font-semibold hover:text-primary">{a.symbol}</Link>
                <span>went {a.direction} {fmt(a.target)} — hit {fmt(a.triggered_price)}</span>
                <span className="text-xs text-muted-foreground">{new Date(a.triggered_at!).toLocaleString()}</span>
                <button onClick={() => del(a.id)} className="ml-auto text-xs text-muted-foreground hover:text-bear">Stäng</button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title={`Bevakas (${open.length})`}>
        {!open.length ? <p className="p-4 text-sm text-muted-foreground">Inga aktiva larm. Öppna en aktie och sätt ett målpris.</p> : (
          <ul className="divide-y divide-border">
            {open.map((a) => (
              <li key={a.id} className="flex items-center gap-4 px-4 py-3 font-mono text-sm">
                <Link to="/stock/$symbol" params={{ symbol: a.symbol }} className="font-semibold hover:text-primary">{a.symbol}</Link>
                <span>{a.direction} {fmt(a.target)}</span>
                <button onClick={() => del(a.id)} className="ml-auto text-xs text-muted-foreground hover:text-bear">Ta bort</button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
