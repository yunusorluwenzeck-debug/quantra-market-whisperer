import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProgress } from "@/lib/progress.functions";
import { CAREER, careerLevel, isPeriodicCode } from "@/lib/progress";

export const Route = createFileRoute("/_authenticated/career")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Karriär – från nybörjare till mästare | StockLab" },
      { name: "description", content: "Gå från Nybörjare till Investeringsmästare genom att lära dig och investera klokt." },
      { property: "og:title", content: "Karriär – från nybörjare till mästare | StockLab" },
      { property: "og:description", content: "Gå från Nybörjare till Investeringsmästare genom att lära dig och investera klokt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Career,
});

function Career() {
  const load = useServerFn(getProgress);
  const { data, isLoading } = useQuery({ queryKey: ["progress"], queryFn: () => load() });
  if (isLoading || !data) return <div className="h-40 animate-pulse rounded-2xl bg-muted" />;
  const input = { xp: data.xp, achievements: new Set(data.achievements.map((a) => a.code)), missions: data.missions.filter((m) => !isPeriodicCode(m.code)).length };
  const lvl = careerLevel(input);
  const cur = CAREER[lvl]!;
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Karriär</h1>
        <p className="text-sm text-muted-foreground">Du går upp genom att lära dig och bygga en klok portfölj — inte genom att handla mycket eller ta stora risker.</p>
      </div>
      <section className="flex items-center gap-4 rounded-2xl border border-primary/40 bg-card p-5">
        <span className="text-4xl">{cur.badge}</span>
        <div className="min-w-0">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Din titel · nivå {lvl + 1} av {CAREER.length}</div>
          <div className="truncate text-2xl font-bold">{cur.title}</div>
          <div className="text-xs text-muted-foreground">{data.xp} XP</div>
        </div>
      </section>
      <ol className="grid gap-3">
        {CAREER.map((c, i) => {
          const state = i <= lvl ? "done" : i === lvl + 1 ? "next" : "locked";
          return (
            <li key={c.title} className={`rounded-2xl border bg-card p-4 ${state === "next" ? "border-primary" : "border-border"} ${state === "locked" ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{state === "locked" ? "🔒" : c.badge}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{i + 1}. {c.title}</div>
                  <div className="text-xs text-muted-foreground">Låser upp: {c.unlock}</div>
                </div>
                {state === "done" && <span className="rounded bg-primary/15 px-2 py-0.5 font-mono text-xs text-primary">Klar</span>}
                {state === "next" && <span className="rounded bg-accent px-2 py-0.5 font-mono text-xs">Nästa</span>}
              </div>
              {c.reqs.length > 0 && state !== "done" && (
                <ul className="mt-3 grid gap-1 text-sm">
                  {c.reqs.map((r) => <li key={r.label} className={r.ok(input) ? "text-primary" : "text-muted-foreground"}>{r.ok(input) ? "✓" : "○"} {r.label}</li>)}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
