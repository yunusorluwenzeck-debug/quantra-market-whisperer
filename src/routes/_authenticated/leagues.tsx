import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/AppShell";
import { createLeague, getMyLeagues, joinLeague, leaveLeague } from "@/lib/leagues.functions";

export const Route = createFileRoute("/_authenticated/leagues")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Ligor – tävla med vänner | StockLab" },
      { name: "description", content: "Skapa privata ligor och jämför virtuell avkastning med dina vänner." },
      { property: "og:title", content: "Ligor – tävla med vänner | StockLab" },
      { property: "og:description", content: "Skapa privata ligor och jämför virtuell avkastning med dina vänner." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Leagues,
});

const field = "rounded-md border border-input bg-background px-3 py-2 text-sm";

function Leagues() {
  const qc = useQueryClient();
  const load = useServerFn(getMyLeagues);
  const create = useServerFn(createLeague);
  const join = useServerFn(joinLeague);
  const leave = useServerFn(leaveLeague);
  const { data, isLoading } = useQuery({ queryKey: ["leagues"], queryFn: () => load() });
  const [displayName, setDisplayName] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<{ ok: boolean; error?: string | null }>, okMsg: string) {
    setBusy(true);
    try {
      const r = await fn();
      if (!r.ok) toast.error(r.error ?? "Något gick fel"); else { toast.success(okMsg); setName(""); setCode(""); qc.invalidateQueries({ queryKey: ["leagues"] }); }
    } catch { toast.error("Kontrollera fälten och försök igen"); } finally { setBusy(false); }
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Ligor</h1>
        <p className="text-sm text-muted-foreground">Tävla med vänner i privata ligor. Bara virtuella pengar — inga insatser eller priser. Andra ser bara ditt visningsnamn och din avkastning i procent.</p>
      </div>
      <Card title="Gå med eller skapa">
        <div className="grid gap-4 p-4 md:grid-cols-3">
          <label className="grid gap-1 text-xs text-muted-foreground">Ditt visningsnamn
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={24} placeholder="t.ex. Anna" className={field} />
          </label>
          <form className="grid gap-1 text-xs text-muted-foreground" onSubmit={(e) => { e.preventDefault(); run(() => join({ data: { code, displayName } }), "Du är med i ligan!"); }}>
            Inbjudningskod
            <div className="flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} placeholder="ABC123" className={`${field} min-w-0 flex-1 font-mono uppercase`} />
              <button disabled={busy || code.length !== 6 || displayName.trim().length < 2} className="shrink-0 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">Gå med</button>
            </div>
          </form>
          <form className="grid gap-1 text-xs text-muted-foreground" onSubmit={(e) => { e.preventDefault(); run(() => create({ data: { name, displayName } }), "Ligan är skapad"); }}>
            Ny liga
            <div className="flex gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Ligans namn" className={`${field} min-w-0 flex-1`} />
              <button disabled={busy || name.trim().length < 2 || displayName.trim().length < 2} className="shrink-0 rounded-md border border-border px-3 text-sm hover:bg-accent disabled:opacity-50">Skapa</button>
            </div>
          </form>
        </div>
      </Card>
      {isLoading ? <div className="h-32 animate-pulse rounded-2xl bg-muted" /> : !data?.length ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Du är inte med i någon liga ännu. Skapa en och dela koden med dina vänner.</p>
      ) : data.map((l) => (
        <Card key={l.id} title={l.name} right={<span className="font-mono text-xs text-muted-foreground">Kod: <b className="text-foreground">{l.code}</b></span>}>
          <ol className="divide-y divide-border">
            {l.board.map((m, i) => (
              <li key={i} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${m.me ? "bg-accent/50" : ""}`}>
                <span className="w-6 font-mono text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{m.name}{m.me && " (du)"}</span>
                <span className={`font-mono ${m.returnPct >= 0 ? "text-bull" : "text-bear"}`}>{m.returnPct >= 0 ? "+" : ""}{m.returnPct.toFixed(2)} %</span>
              </li>
            ))}
          </ol>
          <div className="border-t border-border px-4 py-2 text-right">
            <button onClick={() => { if (confirm(l.isOwner ? "Radera ligan för alla?" : "Lämna ligan?")) run(() => leave({ data: { id: l.id } }), l.isOwner ? "Ligan raderades" : "Du lämnade ligan"); }} className="text-xs text-muted-foreground hover:text-destructive">{l.isOwner ? "Radera liga" : "Lämna"}</button>
          </div>
        </Card>
      ))}
    </div>
  );
}
