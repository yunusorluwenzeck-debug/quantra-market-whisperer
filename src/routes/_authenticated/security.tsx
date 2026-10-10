import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/AppShell";
import { deleteMyData, exportMyData, getSecurityStatus } from "@/lib/security.functions";

export const Route = createFileRoute("/_authenticated/security")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Security & privacy — Quantra" },
      { name: "description", content: "Live security checks, activity log, and controls to export or delete your Quantra data." },
      { property: "og:title", content: "Security & privacy — Quantra" },
      { property: "og:description", content: "Live security checks, activity log, and controls to export or delete your Quantra data." },
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
const WORD: Record<string, string> = { pass: "Passed", fail: "Failed", warn: "Warning", info: "Info" };

function SecurityPage() {
  const status = useServerFn(getSecurityStatus);
  const doExport = useServerFn(exportMyData);
  const doDelete = useServerFn(deleteMyData);
  const [confirm, setConfirm] = useState("");
  const { data, isFetching, refetch } = useQuery({ queryKey: ["security-status"], queryFn: () => status(), staleTime: 60_000 });

  async function download() {
    const d = await doExport();
    const blob = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `quantra-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function wipe() {
    const r = await doDelete({ data: { confirm: "DELETE" } });
    if (r.ok) { toast.success("Your data was deleted"); setConfirm(""); } else toast.error(r.error ?? "Failed");
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Security & privacy</h1>
        <p className="text-sm text-muted-foreground">Every result below comes from a check run on the server when you open this page. No system is unhackable — this shows what is protected, what passed, and what is still limited.</p>
      </div>

      {data && !data.owner && (
        <Card title="Security checks"><p className="text-sm text-muted-foreground">Only the account owner can see the security checks. Your data controls are below.</p></Card>
      )}

      {data?.owner && (
        <>
          <Card title="Live checks" right={<button onClick={() => refetch()} disabled={isFetching} className="font-mono text-xs text-muted-foreground hover:text-foreground">{isFetching ? "Running…" : "Run again"}</button>}>
            <p className="mb-3 font-mono text-[11px] text-muted-foreground">Last run {new Date(data.ranAt).toLocaleString("en-GB")}</p>
            <ul className="grid gap-2">
              {data.checks.map((c) => (
                <li key={c.id} className="flex items-start gap-3 rounded-md border border-border p-3">
                  <span className={`shrink-0 rounded px-2 py-0.5 font-mono text-[10px] uppercase ${TONE[c.status]}`}>{WORD[c.status]}</span>
                  <div>
                    <div className="text-sm font-medium">{c.label}{c.critical && <span className="ml-2 font-mono text-[10px] text-muted-foreground">CRITICAL</span>}</div>
                    <div className="text-xs text-muted-foreground">{c.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Real-money trading">
            <p className="text-sm"><span className="font-mono text-xs uppercase text-destructive">Locked</span> — {data.liveTrading.reason}. All trades in Quantra are simulated paper trades.</p>
          </Card>

          <Card title="Outside services that receive data">
            <ul className="grid gap-1 text-sm">
              {data.providers.map((p) => <li key={p.name}><span className="font-medium">{p.name}:</span> <span className="text-muted-foreground">{p.gets}</span></li>)}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">Your financial data is never sold, published or shared beyond this list.</p>
          </Card>

          <Card title="Recent security activity">
            {data.events.length === 0 ? <p className="text-sm text-muted-foreground">No events yet.</p> : (
              <ul className="grid gap-1 font-mono text-xs">
                {data.events.map((e, i) => (
                  <li key={i} className="flex gap-3"><span className="text-muted-foreground">{new Date(e.created_at).toLocaleString("en-GB")}</span><span>{e.kind.replaceAll("_", " ")}</span></li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Kept for 180 days. Never contains passwords or keys.</p>
          </Card>
        </>
      )}

      <Card title="Your data">
        <div className="grid gap-4">
          <div>
            <button onClick={() => void download()} className="rounded-md bg-primary px-3 py-1.5 font-mono text-xs font-semibold text-primary-foreground">Export my data</button>
            <p className="mt-1 text-xs text-muted-foreground">Downloads your portfolio, trades, autopilot settings and log, lists, alerts and activity as a file.</p>
          </div>
          <div>
            <p className="text-sm">Delete my data — removes your paper portfolio, trades, autopilot settings, lists and alerts. This cannot be undone. Type <span className="font-mono">DELETE</span> to confirm.</p>
            <div className="mt-2 flex gap-2">
              <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" className="w-32 rounded-md border border-input bg-card px-3 py-1.5 font-mono text-xs outline-none focus:ring-2 focus:ring-ring" />
              <button disabled={confirm !== "DELETE"} onClick={() => void wipe()} className="rounded-md bg-destructive px-3 py-1.5 font-mono text-xs font-semibold text-destructive-foreground disabled:opacity-40">Delete</button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
