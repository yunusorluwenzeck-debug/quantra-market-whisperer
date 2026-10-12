import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Swords, Check } from "lucide-react";
import { getHome } from "@/lib/game.functions";
import { SCENARIOS } from "@/lib/game";
import { GameCard, LevelPill, GoldBadge } from "@/components/game";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/challenge/")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Börsutmaningen — simulerade marknader | StockLab" },
      { name: "description", content: "Fatta investeringsbeslut i simulerade marknadsscenarier och se hur spridning, risk och avgifter påverkar resultatet." },
      { property: "og:title", content: "Börsutmaningen — simulerade marknader | StockLab" },
      { property: "og:description", content: "Fatta investeringsbeslut i simulerade marknadsscenarier." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChallengeList,
});

function ChallengeList() {
  const { data } = useQuery({ queryKey: ["game-home"], queryFn: () => getHome() });
  return (
    <div className="grid gap-6">
      <div>
        <div className="flex items-center gap-2 text-primary"><Swords className="h-6 w-6" /><span className="font-mono text-xs uppercase tracking-widest">Spelläge</span></div>
        <h1 className="mt-1 text-3xl font-extrabold">BÖRSUTMANINGEN</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">Du får en budget, ett mål och en marknad som förändras. Poängen belönar spridning, rimlig risk och lugna beslut — inte vågspel. Utmaningarna påverkar inte din riktiga virtuella portfölj.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {SCENARIOS.map((s) => {
          const passed = data?.challengesPassed.includes(s.id);
          const best = data?.bestByScenario[s.id];
          return (
            <GameCard key={s.id} glow={passed ? "gold" : undefined} className="flex flex-col">
              <div className="flex items-center justify-between"><LevelPill level={s.level} />{passed && <GoldBadge><Check className="h-3 w-3" /> Klarad</GoldBadge>}</div>
              <h2 className="mt-3 text-xl font-bold">{s.title}</h2>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{s.objective}</p>
              <div className="mt-3 font-mono text-xs text-muted-foreground">{s.budget.toLocaleString("sv-SE")} kr · {s.period}{best != null && ` · Bäst: ${best} p`}</div>
              <Button asChild className="mt-4"><Link to="/challenge/$id" params={{ id: s.id }}>{best != null ? "Spela igen" : "Starta"}</Link></Button>
            </GameCard>
          );
        })}
      </div>
    </div>
  );
}
