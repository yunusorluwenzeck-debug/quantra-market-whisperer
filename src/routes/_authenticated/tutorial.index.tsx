import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Lock, Check, Play } from "lucide-react";
import { getHome } from "@/lib/game.functions";
import { CHAPTERS } from "@/lib/game";
import { GameCard, XpBar, GoldBadge } from "@/components/game";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tutorial/")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Handledning — lär dig investera | StockLab" },
      { name: "description", content: "Sju interaktiva kapitel som lär dig aktier, fonder, spridning och risk med virtuella pengar." },
      { property: "og:title", content: "Handledning — lär dig investera | StockLab" },
      { property: "og:description", content: "Sju interaktiva kapitel som lär dig aktier, fonder, spridning och risk med virtuella pengar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TutorialMap,
});

function TutorialMap() {
  const { data } = useQuery({ queryKey: ["game-home"], queryFn: () => getHome() });
  const done = new Set(data?.tutorialDone ?? []);
  const totalXp = CHAPTERS.reduce((s, c) => s + c.xp, 0);
  const earned = CHAPTERS.filter((c) => done.has(c.n)).reduce((s, c) => s + c.xp, 0);
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div>
        <GoldBadge>Nivå 1 · Grunderna</GoldBadge>
        <h1 className="mt-2 text-3xl font-extrabold">Handledning</h1>
        <p className="mt-1 text-muted-foreground">Klara kapitlen i ordning. Du kan spela om dem när du vill — XP ges bara första gången.</p>
        <div className="mt-4 flex items-center gap-3"><XpBar value={earned} max={totalXp} className="flex-1" /><span className="font-mono text-xs text-muted-foreground">{earned}/{totalXp} XP</span></div>
      </div>
      <ol className="relative grid gap-3 border-l-2 border-dashed border-border pl-6">
        {CHAPTERS.map((c) => {
          const isDone = done.has(c.n);
          const unlocked = c.n === 1 || done.has(c.n - 1);
          return (
            <li key={c.n} className="relative">
              <span className={cn("absolute -left-[37px] top-5 grid h-7 w-7 place-items-center rounded-full border-2 text-xs font-bold",
                isDone ? "border-primary bg-primary text-primary-foreground" : unlocked ? "border-gold bg-card text-gold" : "border-border bg-muted text-muted-foreground")}>
                {isDone ? <Check className="h-4 w-4" /> : c.n}
              </span>
              <GameCard glow={unlocked && !isDone ? "primary" : undefined} className={cn(!unlocked && "opacity-60")}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Kapitel {c.n} · {c.tagline}</div>
                    <h2 className="truncate text-lg font-bold">{c.title}</h2>
                  </div>
                  {unlocked ? (
                    <Link to="/tutorial/$chapter" params={{ chapter: String(c.n) }} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                      <Play className="h-4 w-4" />{isDone ? "Spela igen" : "Starta"}
                    </Link>
                  ) : <Lock className="h-5 w-5 shrink-0 text-muted-foreground" aria-label="Låst" />}
                </div>
                <div className="mt-1 text-xs text-gold">+{c.xp} XP</div>
              </GameCard>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
