import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { completeChapter, getHome } from "@/lib/game.functions";
import { CHAPTERS, type Exercise } from "@/lib/game";
import { GameCard, CardLabel, Celebration, XpBar } from "@/components/game";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tutorial/$chapter")({
  staticData: { sitemap: false },
  loader: ({ params }) => {
    const ch = CHAPTERS.find((c) => String(c.n) === params.chapter);
    if (!ch) throw notFound();
    return { n: ch.n };
  },
  head: ({ loaderData }) => {
    const ch = CHAPTERS.find((c) => c.n === loaderData?.n);
    const t = ch ? `Kapitel ${ch.n}: ${ch.title} | StockLab` : "Kapitel | StockLab";
    const d = ch?.objective ?? "Ett kapitel i StockLabs handledning.";
    return { meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }, { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" }] };
  },
  notFoundComponent: () => <GameCard>Kapitlet finns inte. <Link to="/tutorial" className="text-primary">Till handledningen</Link></GameCard>,
  component: ChapterPage,
});

function ChapterPage() {
  const { n } = Route.useLoaderData();
  const ch = CHAPTERS.find((c) => c.n === n)!;
  const qc = useQueryClient();
  const { data: home } = useQuery({ queryKey: ["game-home"], queryFn: () => getHome() });
  const [step, setStep] = useState(0); // 0 explain, 1 exercise, 2 quiz, 3 done
  const [exerciseOk, setExerciseOk] = useState(false);
  const [answer, setAnswer] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [xpGot, setXpGot] = useState(0);
  const locked = home && n > 1 && !home.tutorialDone.includes(n - 1);
  const next = CHAPTERS.find((c) => c.n === n + 1);

  if (locked) return <GameCard className="mx-auto max-w-xl">Klara kapitel {n - 1} först. <Link to="/tutorial" className="text-primary">Till handledningen</Link></GameCard>;

  async function submit() {
    if (answer == null) return;
    setBusy(true);
    try {
      const r = await completeChapter({ data: { n, answer } });
      if (!r.ok) { toast.error(r.error ?? "Något gick fel"); return; }
      setXpGot(r.xp);
      setStep(3);
      qc.invalidateQueries({ queryKey: ["game-home"] });
    } catch { toast.error("Kunde inte spara. Kontrollera anslutningen och försök igen."); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <Link to="/tutorial" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Alla kapitel</Link>
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Kapitel {ch.n} av {CHAPTERS.length}</div>
        <h1 className="text-3xl font-extrabold">{ch.title}</h1>
        <XpBar value={step} max={3} className="mt-3 h-2" />
      </div>
      <GameCard className="border-primary/30">
        <CardLabel>Mål</CardLabel>
        <p className="font-semibold">{ch.objective}</p>
      </GameCard>

      {step === 0 && (
        <GameCard>
          <CardLabel>Förklaring</CardLabel>
          <div className="grid gap-3">{ch.explain.map((p, i) => <p key={i} className="leading-relaxed">{p}</p>)}</div>
          <Button className="mt-5" onClick={() => setStep(1)}>Till övningen <ArrowRight className="h-4 w-4" /></Button>
        </GameCard>
      )}

      {step === 1 && (
        <GameCard>
          <CardLabel>Övning</CardLabel>
          <ExerciseView kind={ch.exercise} onOk={() => setExerciseOk(true)} />
          <Button className="mt-5" disabled={!exerciseOk} onClick={() => setStep(2)}>Till kunskapsfrågan <ArrowRight className="h-4 w-4" /></Button>
        </GameCard>
      )}

      {step === 2 && (
        <GameCard>
          <CardLabel>Kunskapsfråga</CardLabel>
          <p className="font-semibold">{ch.question}</p>
          <div className="mt-3 grid gap-2">
            {ch.options.map((o, i) => (
              <button key={o} onClick={() => setAnswer(i)} className={cn("rounded-xl border p-3 text-left text-sm transition-colors", answer === i ? "border-primary bg-primary/10 font-semibold" : "border-border hover:border-primary/40")}>{o}</button>
            ))}
          </div>
          <Button className="mt-5" disabled={answer == null || busy} onClick={submit}>{busy ? "Sparar…" : "Svara"}</Button>
        </GameCard>
      )}

      {step === 3 && (
        <Celebration title={`Kapitel ${ch.n} klart!`} xp={xpGot}>
          <div className="flex flex-wrap justify-center gap-2">
            {next ? <Button asChild><Link to="/tutorial/$chapter" params={{ chapter: String(next.n) }} onClick={() => { setStep(0); setAnswer(null); setExerciseOk(false); }}>Nästa kapitel <ArrowRight className="h-4 w-4" /></Link></Button>
              : <Button asChild><Link to="/challenge">Till Börsutmaningen</Link></Button>}
            <Button asChild variant="outline"><Link to="/">Hem</Link></Button>
          </div>
        </Celebration>
      )}
    </div>
  );
}

const sek = (n: number) => `${Math.round(n).toLocaleString("sv-SE")} kr`;

function ExerciseView({ kind, onOk }: { kind: Exercise; onOk: () => void }) {
  const qc = useQueryClient();
  const [years, setYears] = useState(10);
  const [pick, setPick] = useState<number | null>(null);
  const [alloc, setAlloc] = useState<Record<string, number>>({ "Global indexfond": 0, "Räntefond": 0, "Sverigefond": 0, "Volvo": 0, "Ericsson": 0, "Spotify": 0 });
  const [risk, setRisk] = useState(3);
  const [checking, setChecking] = useState(false);

  if (kind === "compound") {
    const v = 100000 * Math.pow(1.07, years);
    return (
      <div className="grid gap-3">
        <p className="text-sm">Dra i reglaget och se hur 100 000 kr kan växa med 7 % per år.</p>
        <Slider min={1} max={40} step={1} value={[years]} onValueChange={(x) => { setYears(x[0]!); if (x[0]! >= 20) onOk(); }} />
        <div className="flex justify-between font-mono text-sm"><span>{years} år</span><span className="text-2xl font-bold text-primary">{sek(v)}</span></div>
        <p className="text-xs text-muted-foreground">{years < 20 ? "Testa minst 20 år för att gå vidare." : "Ser du hur kurvan tar fart? Det är ränta på ränta."}</p>
      </div>
    );
  }
  if (kind === "pick-stock") {
    const opts = ["Ett sparkonto på banken", "En andel i Volvo AB", "En statsobligation"];
    return (
      <div className="grid gap-2">
        <p className="text-sm">Vilket av dessa är en aktie?</p>
        {opts.map((o, i) => (
          <button key={o} onClick={() => { setPick(i); if (i === 1) onOk(); }} className={cn("rounded-xl border p-3 text-left text-sm", pick === i ? (i === 1 ? "border-primary bg-primary/10" : "border-bear bg-bear/10") : "border-border")}>{o}</button>
        ))}
        {pick != null && <p className="text-sm">{pick === 1 ? "✅ Rätt! Du blir delägare i bolaget." : "Inte riktigt — försök igen."}</p>}
      </div>
    );
  }
  if (kind === "real-trade" || kind === "challenge") {
    const isTrade = kind === "real-trade";
    async function check() {
      setChecking(true);
      const h = await qc.fetchQuery({ queryKey: ["game-home-check", Date.now()], queryFn: () => getHome() }).catch(() => null);
      setChecking(false);
      const ok = isTrade ? h?.achievementCodes.includes("first_trade") : h && Object.keys(h.bestByScenario).length > 0;
      if (ok) { onOk(); toast.success(isTrade ? "Köpet hittades i din portfölj!" : "Utmaningen är spelad!"); }
      else toast.error(isTrade ? "Inget köp hittades ännu." : "Ingen spelad utmaning hittades ännu.");
    }
    return (
      <div className="grid gap-3">
        <p className="text-sm">{isTrade ? "Öppna Marknaden, välj ett bolag och gör ett virtuellt köp. Kom sedan tillbaka hit." : "Spela valfri utmaning i Börsutmaningen och kom sedan tillbaka hit."}</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to={isTrade ? "/screener" : "/challenge"}>{isTrade ? "Öppna Marknaden" : "Öppna Börsutmaningen"}</Link></Button>
          <Button onClick={check} disabled={checking}><Check className="h-4 w-4" />{checking ? "Kontrollerar…" : "Jag är klar — kontrollera"}</Button>
        </div>
      </div>
    );
  }
  if (kind === "fees") {
    const at = (fee: number) => 100000 * Math.pow(1 + 0.07 - fee / 100, 30);
    return (
      <div className="grid gap-3">
        <p className="text-sm">100 000 kr i 30 år med 7 % avkastning före avgift:</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-muted p-3"><div className="text-xs text-muted-foreground">Avgift 0,2 %</div><div className="font-mono text-xl font-bold text-primary">{sek(at(0.2))}</div></div>
          <div className="rounded-xl bg-muted p-3"><div className="text-xs text-muted-foreground">Avgift 1,5 %</div><div className="font-mono text-xl font-bold text-bear">{sek(at(1.5))}</div></div>
        </div>
        <p className="text-sm">Skillnad: <strong>{sek(at(0.2) - at(1.5))}</strong> — bara på grund av avgiften.</p>
        <Button variant="outline" onClick={onOk}>Jag förstår</Button>
      </div>
    );
  }
  if (kind === "spread") {
    const total = Object.values(alloc).reduce((s, v) => s + v, 0);
    const max = Math.max(...Object.values(alloc));
    const count = Object.values(alloc).filter((v) => v >= 10).length;
    const good = total === 100 && count >= 4 && max <= 30;
    return (
      <div className="grid gap-3">
        <p className="text-sm">Fördela 100 % på minst 4 innehav (minst 10 % var) och max 30 % i ett enskilt innehav.</p>
        {Object.keys(alloc).map((k) => (
          <div key={k} className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div><div className="text-sm">{k}</div><Slider min={0} max={100} step={5} value={[alloc[k]!]} onValueChange={(x) => { const nx = { ...alloc, [k]: x[0]! }; setAlloc(nx); }} /></div>
            <span className="w-12 text-right font-mono text-sm">{alloc[k]} %</span>
          </div>
        ))}
        <div className={cn("rounded-xl p-3 text-sm", good ? "bg-primary/10 text-primary" : "bg-muted")}>
          Totalt {total} % · {count} innehav · största {max} % {good && "— snyggt spridd portfölj! ✅"}
        </div>
        <Button variant="outline" disabled={!good} onClick={onOk}>Bekräfta portföljen</Button>
      </div>
    );
  }
  // risk
  const ranges = { 1: [-3, 5, "Räntefond"], 2: [-10, 12, "Blandfond"], 3: [-25, 30, "Global aktiefond"], 4: [-40, 50, "Tillväxtmarknad"], 5: [-70, 120, "Enskild småbolagsaktie"] } as const;
  const [lo, hi, label] = ranges[risk as 1 | 2 | 3 | 4 | 5];
  return (
    <div className="grid gap-3">
      <p className="text-sm">Dra i risknivån och se hur mycket ett år kan svänga i värde.</p>
      <Slider min={1} max={5} step={1} value={[risk]} onValueChange={(x) => { setRisk(x[0]!); onOk(); }} />
      <div className="rounded-xl bg-muted p-3">
        <div className="text-sm font-semibold">Risknivå {risk}: {label}</div>
        <div className="mt-1 font-mono text-sm">Ett dåligt år: <span className="text-bear">{lo} %</span> · Ett bra år: <span className="text-bull">+{hi} %</span></div>
        <div className="mt-1 text-xs text-muted-foreground">På 100 000 kr: {sek(100000 * (1 + lo / 100))} till {sek(100000 * (1 + hi / 100))}</div>
      </div>
    </div>
  );
}
