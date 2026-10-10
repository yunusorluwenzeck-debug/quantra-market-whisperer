import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/AppShell";
import { MfaSettings } from "@/components/Mfa";
import { deleteMyData, exportMyData, getSecurityStatus } from "@/lib/security.functions";

export const Route = createFileRoute("/_authenticated/security")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Säkerhet och integritet — StockLab" },
      { name: "description", content: "Säkerhetskontroller, aktivitetslogg och möjlighet att exportera eller radera din data." },
      { property: "og:title", content: "Säkerhet och integritet — StockLab" },
      { property: "og:description", content: "Säkerhetskontroller, aktivitetslogg och möjlighet att exportera eller radera din data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SecurityPage,
});

const TONE: Record<string, string> = {
  pass: "bg-primary/15 text-primary",
  fail: "bg-destructive/15 text-destructive",
  warn: "bg-accent text-foreground",
  info: "bg-muted text-muted-foreground",
};
const WORD: Record<string, string> = { pass: "Godkänd", fail: "Misslyckades", warn: "Varning", info: "Info" };

function SecurityPage() {
  const status = useServerFn(getSecurityStatus);
  const doExport = useServerFn(exportMyData);
  const doDelete = useServerFn(deleteMyData);
  const [confirm, setConfirm] = useState("");
  const { data, isFetching, refetch } = useQuery({ queryKey: ["security-status"], queryFn: () => status(), staleTime: 60_000 });

  async function download() {
    const d = await doExport();
    const blob = new Blob([d], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `quantra-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function wipe() {
    const r = await doDelete({ data: { confirm: "DELETE" } });
    if (r.ok) { toast.success("Din data har raderats"); setConfirm(""); } else toast.error(r.error ?? "Misslyckades");
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Säkerhet och integritet</h1>
        <p className="text-sm text-muted-foreground">Varje resultat nedan kommer från en kontroll som körs på servern när du öppnar sidan. Inget system är helt säkert — här ser du vad som skyddas, vad som godkänts och vad som fortfarande är begränsat.</p>
      </div>

      <MfaSettings />

      {data && !data.owner && (
        <Card title="Säkerhetskontroller"><p className="text-sm text-muted-foreground">Bara kontoägaren ser säkerhetskontrollerna. Dina datainställningar finns nedan.</p></Card>
      )}

      {data?.owner && (
        <>
          <Card title="Aktuella kontroller" right={<button onClick={() => refetch()} disabled={isFetching} className="font-mono text-xs text-muted-foreground hover:text-foreground">{isFetching ? "Kör…" : "Kör igen"}</button>}>
            <p className="mb-3 font-mono text-[11px] text-muted-foreground">Last run {new Date(data.ranAt).toLocaleString("sv-SE")}</p>
            <ul className="grid gap-2">
              {data.checks.map((c) => (
                <li key={c.id} className="flex items-start gap-3 rounded-md border border-border p-3">
                  <span className={`shrink-0 rounded px-2 py-0.5 font-mono text-[10px] uppercase ${TONE[c.status]}`}>{WORD[c.status]}</span>
                  <div>
                    <div className="text-sm font-medium">{c.label}{c.critical && <span className="ml-2 font-mono text-[10px] text-muted-foreground">KRITISK</span>}</div>
                    <div className="text-xs text-muted-foreground">{c.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Handel med riktiga pengar">
            <p className="text-sm"><span className="font-mono text-xs uppercase text-destructive">Låst</span> — {data.liveTrading.reason}. Alla affärer i StockLab är simulerade med virtuella pengar.</p>
          </Card>

          <Card title="Externa tjänster som tar emot data">
            <ul className="grid gap-1 text-sm">
              {data.providers.map((p) => <li key={p.name}><span className="font-medium">{p.name}:</span> <span className="text-muted-foreground">{p.gets}</span></li>)}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">Din ekonomiska data säljs, publiceras eller delas aldrig utöver denna lista.</p>
          </Card>

          <Card title="Inloggningsförsök stoppade av gränser">
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-xs">
                <thead className="text-left text-[10px] uppercase text-muted-foreground"><tr><th className="py-1">Typ</th><th>Period</th><th className="text-right">Per besökare</th><th className="text-right">Hela appen</th></tr></thead>
                <tbody>
                  {data.blocked.flatMap((b) => b.periods.map((p, i) => (
                    <tr key={b.endpoint + p.label} className="border-t border-border/50">
                      <td className="py-1">{i === 0 ? b.endpoint : ""}</td><td>{p.label}</td>
                      <td className="text-right">{p.visitor}</td><td className="text-right">{p.appWide}</td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Senaste säkerhetshändelser">
            {data.events.length === 0 ? <p className="text-sm text-muted-foreground">Inga händelser än.</p> : (
              <ul className="grid gap-1 font-mono text-xs">
                {data.events.map((e, i) => (
                  <li key={i} className="flex gap-3"><span className="text-muted-foreground">{new Date(e.created_at).toLocaleString("sv-SE")}</span><span>{e.kind.replaceAll("_", " ")}</span></li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Sparas i 180 dagar. Innehåller aldrig lösenord eller nycklar.</p>
          </Card>
        </>
      )}

      <Card title="Din data">
        <div className="grid gap-4">
          <div>
            <button onClick={() => void download()} className="rounded-md bg-primary px-3 py-1.5 font-mono text-xs font-semibold text-primary-foreground">Exportera min data</button>
            <p className="mt-1 text-xs text-muted-foreground">Laddar ner portfölj, affärer, autopilotinställningar och logg, listor, larm och aktivitet som en fil.</p>
          </div>
          <div>
            <p className="text-sm">Radera min data — tar bort din virtuella portfölj, affärer, autopilotinställningar, listor och larm. Detta kan inte ångras. Skriv <span className="font-mono">DELETE</span> för att bekräfta.</p>
            <div className="mt-2 flex gap-2">
              <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" className="w-32 rounded-md border border-input bg-card px-3 py-1.5 font-mono text-xs outline-none focus:ring-2 focus:ring-ring" />
              <button disabled={confirm !== "DELETE"} onClick={() => void wipe()} className="rounded-md bg-destructive px-3 py-1.5 font-mono text-xs font-semibold text-destructive-foreground disabled:opacity-40">Radera</button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
