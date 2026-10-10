import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getEmailPanel, getEmailStatus, saveEmailSettings, sendTestEmail } from "@/lib/trading.functions";
import { Card } from "@/components/AppShell";

export function EmailAlerts() {
  const qc = useQueryClient();
  const status = useServerFn(getEmailStatus);
  const test = useServerFn(sendTestEmail);
  const save = useServerFn(saveEmailSettings);
  const panel = useServerFn(getEmailPanel);
  const { data: addr } = useQuery({ queryKey: ["gmail"], queryFn: () => status() });
  const { data } = useQuery({
    queryKey: ["email-settings"], refetchInterval: 60_000,
    queryFn: () => panel(),
  });
  const [f, setF] = useState({ enabled: false, min_score: 85, max_sequences_per_day: 3, stage_gap_minutes: 120 });
  useEffect(() => { if (data?.s) setF({ enabled: data.s.enabled, min_score: data.s.min_score, max_sequences_per_day: data.s.max_sequences_per_day, stage_gap_minutes: data.s.stage_gap_minutes }); }, [data?.s]);
  async function submit(over?: Partial<typeof f>) {
    const r = await save({ data: { ...f, ...over } });
    if (!r.ok) { toast.error(r.error ?? "Save failed"); return; }
    toast.success("Email settings saved");
    qc.invalidateQueries({ queryKey: ["email-settings"] });
  }
  const num = (k: "min_score" | "max_sequences_per_day" | "stage_gap_minutes", label: string) => (
    <label className="grid gap-1 text-xs"><span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input type="number" value={f[k]} onChange={(e) => setF({ ...f, [k]: Number(e.target.value) })} className="rounded-md border border-input bg-background px-2 py-1.5 font-mono text-sm" />
    </label>
  );
  if (data && !data.owner) return null;
  return (
    <Card title="Gmail opportunity alerts">
      <div className="grid gap-4 p-4 text-sm">
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          <span>Connected Gmail: <b className={addr?.address ? "text-bull" : "text-bear"}>{addr?.address ?? addr?.error ?? "checking…"}</b></span>
          <button onClick={async () => { const r = await test(); r.ok ? toast.success(`Test email sent to ${"to" in r ? r.to : "your Gmail"}`) : toast.error(r.error ?? "Failed"); }} className="rounded border border-border px-2 py-1 hover:bg-accent">Send test email</button>
          <button onClick={() => { setF({ ...f, enabled: !f.enabled }); void submit({ enabled: !f.enabled }); }} className={`ml-auto rounded px-3 py-1.5 font-semibold ${f.enabled ? "border border-border" : "bg-primary text-primary-foreground"}`}>{f.enabled ? "Disable emails" : "Enable emails"}</button>
        </div>
        <p className="text-xs text-muted-foreground">For each new opportunity you get exactly three emails: detected, update, and final status — spaced apart, never all at once. The same unchanged signal never triggers a new sequence.</p>
        <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="flex flex-wrap items-end gap-3">
          {num("min_score", "Min score")}{num("max_sequences_per_day", "Max new per day")}{num("stage_gap_minutes", "Minutes between emails")}
          <button className="rounded-md border border-border px-3 py-1.5 font-mono text-xs">Save</button>
        </form>
        {!!data?.opps.length && (
          <ul className="divide-y divide-border rounded border border-border font-mono text-xs">
            {data.opps.map((o) => (
              <li key={o.id} className="flex flex-wrap gap-3 px-3 py-2">
                <span className={o.action === "BUY" ? "text-bull" : "text-bear"}>{o.action}</span><b>{o.symbol}</b>
                <span className="text-muted-foreground">{o.code}</span>
                <span className="ml-auto">{o.status === "done" ? "complete" : `email ${o.stage}/3 sent`}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
