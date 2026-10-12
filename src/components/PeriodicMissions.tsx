import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PushToggle } from "./PushToggle";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { claimPeriodicMission, getPeriodicMissions } from "@/lib/progress.functions";
import { trackSave } from "@/lib/save-status";

export function PeriodicMissions() {
  const load = useServerFn(getPeriodicMissions);
  const claim = useServerFn(claimPeriodicMission);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["periodic"], queryFn: () => load() });
  const [pick, setPick] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  if (isLoading || !data) return <div className="h-40 animate-pulse rounded-2xl bg-muted" />;

  async function go(id: string, answer?: number) {
    setBusy(id);
    const r = await trackSave(() => claim({ data: { id, answer } }));
    setBusy(null);
    if (!r.ok) { toast.error(r.error ?? "Misslyckades"); return; }
    toast.success(`Uppdrag klart! +${r.xp} XP`);
    qc.invalidateQueries({ queryKey: ["periodic"] });
    qc.invalidateQueries({ queryKey: ["progress"] });
  }

  const group = (period: "daily" | "weekly", title: string, note: string) => {
    const list = data.missions.filter((m) => m.period === period);
    return (
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="font-semibold">{title} ({list.filter((m) => m.claimed).length}/{list.length})</h2>
          <span className="font-mono text-[11px] text-muted-foreground">{note}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((m) => (
            <div key={m.id} className={`flex flex-col rounded-2xl border bg-card p-4 ${m.claimed ? "border-primary/50" : "border-border"}`}>
              <div className="flex justify-between gap-2 text-sm font-semibold"><span>{m.claimed ? "✓ " : ""}{m.title}</span><span className="shrink-0 font-mono text-xs text-primary">+{m.xp} XP</span></div>
              <p className="mt-1 text-xs text-muted-foreground">{m.desc}</p>
              {m.progress && !m.claimed && <p className="mt-1 font-mono text-[11px] text-muted-foreground">{m.progress}</p>}
              <div className="mt-auto pt-3">
                {m.claimed ? <span className="text-sm text-bull">Klart!</span> : m.quiz ? (
                  <div className="grid gap-1.5">
                    <div className="text-sm font-medium">{data.quiz.q}</div>
                    {data.quiz.options.map((o, i) => (
                      <label key={o} className="flex items-center gap-2 text-xs"><input type="radio" name="daily-quiz" checked={pick === i} onChange={() => setPick(i)} />{o}</label>
                    ))}
                    <button disabled={busy === m.id || pick === null} onClick={() => go(m.id, pick ?? undefined)} className="mt-1 rounded-md bg-primary py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">Svara</button>
                  </div>
                ) : (
                  <button disabled={!m.met || busy === m.id} onClick={() => go(m.id)} className="w-full rounded-md bg-primary py-1.5 text-xs font-semibold text-primary-foreground disabled:bg-muted disabled:text-muted-foreground">
                    {m.met ? "Hämta XP" : "Inte klart än"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  };
  return (
    <>
      <PushToggle />
      {group("daily", "Dagens uppdrag", "Nollställs vid midnatt")}
      {group("weekly", "Veckans uppdrag", "Nollställs måndag")}
    </>
  );
}
