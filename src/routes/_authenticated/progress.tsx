import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { getProgress, completeMission } from "@/lib/progress.functions";
import { ACHIEVEMENTS, MISSIONS, levelOf } from "@/lib/progress";
import { trackSave } from "@/lib/save-status";
import { PeriodicMissions } from "@/components/PeriodicMissions";
import { isPeriodicCode } from "@/lib/progress";

export const Route = createFileRoute("/_authenticated/progress")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Framsteg – XP och uppdrag | StockLab" },
      { name: "description", content: "Samla XP, gå upp i nivå och klara lärandeuppdrag om investeringar." },
      { property: "og:title", content: "Framsteg – XP och uppdrag | StockLab" },
      { property: "og:description", content: "Samla XP, gå upp i nivå och klara lärandeuppdrag om investeringar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Progress,
});

function Progress() {
  const load = useServerFn(getProgress);
  const { data, isLoading } = useQuery({ queryKey: ["progress"], queryFn: () => load() });
  if (isLoading || !data) return <div className="text-sm text-muted-foreground">Laddar framsteg…</div>;
  const lv = levelOf(data.xp);
  const got = new Set(data.achievements.map((a) => a.code));
  const done = new Set(data.missions.filter((m) => !isPeriodicCode(m.code)).map((m) => m.code));
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Framsteg</h1>
        <p className="text-sm text-muted-foreground">XP delas ut av servern utifrån dina riktiga (virtuella) affärer och klarade uppdrag.</p>
      </div>
      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-baseline justify-between"><span className="text-xl font-bold">Nivå {lv.level}</span><span className="font-mono text-sm text-muted-foreground">{data.xp} XP</span></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${(lv.current / lv.needed) * 100}%` }} /></div>
        <div className="mt-1 font-mono text-xs text-muted-foreground">{lv.needed - lv.current} XP kvar till nivå {lv.level + 1}</div>
      </section>
      <PeriodicMissions />
      <section>
        <h2 className="mb-3 font-semibold">Prestationer ({got.size}/{ACHIEVEMENTS.length})</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ACHIEVEMENTS.map((a) => (
            <div key={a.code} className={`rounded-lg border p-4 ${got.has(a.code) ? "border-primary bg-card" : "border-border bg-card opacity-60"}`}>
              <div className="flex justify-between text-sm font-semibold"><span>{got.has(a.code) ? "✓ " : ""}{a.title}</span><span className="font-mono text-xs text-primary">+{a.xp}</span></div>
              <p className="mt-1 text-xs text-muted-foreground">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-3 font-semibold">Lärandeuppdrag ({done.size}/{MISSIONS.length})</h2>
        <div className="grid gap-3 md:grid-cols-2">{MISSIONS.map((m) => <Mission key={m.code} m={m} done={done.has(m.code)} />)}</div>
      </section>
    </div>
  );
}

function Mission({ m, done }: { m: (typeof MISSIONS)[number]; done: boolean }) {
  const submit = useServerFn(completeMission);
  const qc = useQueryClient();
  const [pick, setPick] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  async function answer() {
    if (pick === null) return;
    setBusy(true);
    const r = await trackSave(() => submit({ data: { code: m.code, answer: pick } }));
    setBusy(false);
    if (!r.ok) { toast.error(r.error ?? "Misslyckades"); return; }
    toast.success(`Uppdrag klart! +${m.xp} XP`);
    qc.invalidateQueries({ queryKey: ["progress"] });
  }
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex justify-between font-semibold"><span>{done ? "✓ " : ""}{m.title}</span><span className="font-mono text-xs text-primary">+{m.xp} XP</span></div>
      <p className="mt-2 text-sm text-muted-foreground">{m.lesson}</p>
      {done ? <p className="mt-3 text-sm text-bull">Klart!</p> : (
        <div className="mt-3 grid gap-2">
          <div className="text-sm font-medium">{m.question}</div>
          {m.options.map((o, i) => (
            <label key={o} className="flex items-center gap-2 text-sm"><input type="radio" name={m.code} checked={pick === i} onChange={() => setPick(i)} />{o}</label>
          ))}
          <button disabled={busy || pick === null} onClick={answer} className="mt-1 rounded-md bg-primary py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">Svara</button>
        </div>
      )}
    </div>
  );
}
