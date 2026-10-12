import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Newspaper, AlertTriangle } from "lucide-react";
import { submitChallenge } from "@/lib/game.functions";
import { SCENARIOS, REACTIONS, PASS_SCORE, type ChallengeResult, type ReactionId } from "@/lib/game";
import { GameCard, CardLabel, LevelPill, XpBar, Celebration, BigStat } from "@/components/game";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/challenge/$id")({
  staticData: { sitemap: false },
  loader: ({ params }) => {
    if (!SCENARIOS.some((s) => s.id === params.id)) throw notFound();
    return { id: params.id };
  },
  head: ({ loaderData }) => {
    const s = SCENARIOS.find((x) => x.id === loaderData?.id);
    const t = s ? `${s.title} — Börsutmaningen | StockLab` : "Börsutmaningen | StockLab";
    const d = s?.objective ?? "En simulerad marknadsutmaning.";
    return { meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] };
  },
  notFoundComponent: () => <GameCard>Utmaningen finns inte. <Link to="/challenge" className="text-primary">Alla utmaningar</Link></GameCard>,
  component: ChallengePlay,
});

const kr = (n: number) => `${Math.round(n).toLocaleString("sv-SE")} kr`;

function ChallengePlay() {
  const { id } = Route.useLoaderData();
  const sc = SCENARIOS.find((s) => s.id === id)!;
  const qc = useQueryClient();
  const [phase, setPhase] = useState<"brief" | "allocate" | "event" | "result">("brief");
  const [w, setW] = useState<Record<string, number>>(() => Object.fromEntries(sc.assets.map((a) => [a.id, 0])));
  const [reaction, setReaction] = useState<ReactionId | null>(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ result: ChallengeResult; xp: number } | null>(null);
  const total = Object.values(w).reduce((s, v) => s + v, 0);
  const riskNow = sc.assets.reduce((s, a) => s + a.risk * (w[a.id] ?? 0), 0) / 100;

  async function finish() {
    if (!reaction) return;
    setBusy(true);
    try {
      const r = await submitChallenge({ data: { scenarioId: sc.id, weights: w, reaction } });
      if (!r.ok) { toast.error(r.error); return; }
      setRes({ result: r.result, xp: r.xpEarned });
      setPhase("result");
      qc.invalidateQueries({ queryKey: ["game-home"] });
    } catch { toast.error("Kunde inte skicka in. Försök igen."); }
    finally { setBusy(false); }
  }
  function restart() { setPhase("brief"); setReaction(null); setRes(null); setW(Object.fromEntries(sc.assets.map((a) => [a.id, 0]))); }

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <Link to="/challenge" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Alla utmaningar</Link>
      <div>
        <div className="flex items-center gap-2"><LevelPill level={sc.level} /><span className="font-mono text-xs text-muted-foreground">{kr(sc.budget)} · {sc.period}</span></div>
        <h1 className="mt-1 text-3xl font-extrabold">{sc.title}</h1>
        <XpBar value={["brief", "allocate", "event", "result"].indexOf(phase)} max={3} className="mt-3 h-2" />
      </div>

      {phase === "brief" && (
        <GameCard>
          <CardLabel>Ditt mål</CardLabel>
          <p className="font-semibold">{sc.objective}</p>
          <CardLabel icon={<Newspaper className="h-3 w-3" />}><span className="mt-4 block">Marknadsläget</span></CardLabel>
          <ul className="grid list-disc gap-1 pl-5 text-sm">{sc.briefing.map((b) => <li key={b}>{b}</li>)}</ul>
          <p className="mt-3 text-xs text-muted-foreground">Simulerad period: {sc.rounds.join(" → ")}</p>
          <Button className="mt-5" onClick={() => setPhase("allocate")}>Fördela pengarna <ArrowRight className="h-4 w-4" /></Button>
        </GameCard>
      )}

      {phase === "allocate" && (
        <GameCard>
          <CardLabel>Välj din fördelning</CardLabel>
          <div className="grid gap-4">
            {sc.assets.map((a) => (
              <div key={a.id}>
                <div className="flex items-baseline justify-between gap-2">
                  <div><span className="font-semibold">{a.name}</span> <span className="text-xs text-muted-foreground">{a.kind} · risk {a.risk}/5 · avgift {a.feePct.toLocaleString("sv-SE")} %</span></div>
                  <span className="font-mono text-sm">{w[a.id]} %</span>
                </div>
                <p className="text-xs text-muted-foreground">{a.info}</p>
                <Slider className="mt-2" min={0} max={100} step={5} value={[w[a.id]!]} onValueChange={(x) => setW({ ...w, [a.id]: x[0]! })} aria-label={a.name} />
              </div>
            ))}
          </div>
          <div className={cn("mt-4 rounded-xl p-3 text-sm", total === 100 ? "bg-primary/10" : "bg-muted")}>
            Totalt <strong>{total} %</strong> {total !== 100 && "(måste bli 100 %)"} · Risknivå {riskNow.toFixed(1)} (mål {sc.targetRisk[0]}–{sc.targetRisk[1]})
          </div>
          <Button className="mt-4" disabled={total !== 100} onClick={() => setPhase("event")}>Starta simuleringen <ArrowRight className="h-4 w-4" /></Button>
        </GameCard>
      )}

      {phase === "event" && (
        <GameCard glow="gold">
          <CardLabel icon={<AlertTriangle className="h-3 w-3" />}>Marknadshändelse</CardLabel>
          <p className="font-semibold">{sc.midEvent}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {REACTIONS.map((r) => (
              <button key={r.id} onClick={() => setReaction(r.id)} className={cn("rounded-xl border p-3 text-left", reaction === r.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40")}>
                <div className="font-semibold">{r.label}</div><div className="text-xs text-muted-foreground">{r.desc}</div>
              </button>
            ))}
          </div>
          <Button className="mt-4" disabled={!reaction || busy} onClick={finish}>{busy ? "Simulerar…" : "Se resultatet"}</Button>
        </GameCard>
      )}

      {phase === "result" && res && (
        <>
          {res.result.passed
            ? <Celebration title={`Utmaningen klarad — ${res.result.score} poäng`} xp={res.xp} />
            : <GameCard><h2 className="text-xl font-bold">{res.result.score} poäng — inte godkänt än</h2><p className="text-sm text-muted-foreground">Du behöver {PASS_SCORE} poäng. Läs lärdomarna nedan och försök igen!</p></GameCard>}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <GameCard><BigStat label="Slutvärde" value={kr(res.result.endValue)} sub={<span className={res.result.returnPct >= 0 ? "text-bull" : "text-bear"}>{res.result.returnPct >= 0 ? "+" : ""}{res.result.returnPct.toLocaleString("sv-SE")} %</span>} /></GameCard>
            <GameCard><BigStat label="Risknivå" value={`${res.result.riskLevel.toLocaleString("sv-SE")}/5`} /></GameCard>
            <GameCard><BigStat label="Spridning" value={`${res.result.holdings} st`} sub={`Största ${res.result.maxWeightPct} %`} /></GameCard>
            <GameCard><BigStat label="Avgifter" value={kr(res.result.feesPaid)} /></GameCard>
          </div>
          <GameCard>
            <CardLabel>Poäng</CardLabel>
            <div className="grid gap-3">{res.result.scoreParts.map((p) => (
              <div key={p.label}><div className="flex justify-between text-sm"><span>{p.label}</span><span className="font-mono">{p.points}/{p.max}</span></div><XpBar value={p.points} max={p.max} className="mt-1 h-2" /></div>
            ))}</div>
          </GameCard>
          <GameCard>
            <CardLabel>Viktiga händelser</CardLabel>
            <ol className="grid gap-2 text-sm">{res.result.events.map((e, i) => <li key={e} className="flex justify-between gap-3"><span>{e}</span><span className="shrink-0 font-mono text-xs text-muted-foreground">{kr(res.result.path[i] ?? 0)}</span></li>)}</ol>
          </GameCard>
          <GameCard className="border-primary/30">
            <CardLabel>Det här lärde du dig</CardLabel>
            <ul className="grid list-disc gap-1 pl-5 text-sm">{res.result.lessons.map((l) => <li key={l}>{l}</li>)}</ul>
          </GameCard>
          <div className="flex flex-wrap gap-2">
            <Button onClick={restart}>Spela igen</Button>
            <Button asChild variant="outline"><Link to="/challenge">Fler utmaningar</Link></Button>
            <Button asChild variant="outline"><Link to="/">Hem</Link></Button>
          </div>
        </>
      )}
    </div>
  );
}
