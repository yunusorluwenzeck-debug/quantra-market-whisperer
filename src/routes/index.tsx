import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame, Trophy, Target, Wallet, Swords, BookOpen, Sparkles, Play, ChevronRight, GraduationCap } from "lucide-react";
import heroImg from "@/assets/game-hero.jpg";
import { useAuth } from "@/hooks/use-auth";
import { getHome } from "@/lib/game.functions";
import { getPeriodicMissions } from "@/lib/progress.functions";
import { getMyLeagues } from "@/lib/leagues.functions";
import { ACHIEVEMENTS, CAREER, careerLevel, levelOf } from "@/lib/progress";
import { CHAPTERS, SCENARIOS } from "@/lib/game";
import { usd, signed, tone } from "@/lib/format";
import { GameCard, CardLabel, XpBar, BigStat, GoldBadge, Avatar, LevelPill } from "@/components/game";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "StockLab — Lär dig investera genom att spela" },
      { name: "description", content: "Ett svenskt investeringsspel med 100 000 virtuella kronor: handledning, börsutmaningar, uppdrag, karriär och ligor. Inga riktiga pengar." },
      { property: "og:title", content: "StockLab — Lär dig investera genom att spela" },
      { property: "og:description", content: "Ett svenskt investeringsspel med 100 000 virtuella kronor: handledning, börsutmaningar, uppdrag, karriär och ligor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { user, ready } = useAuth();
  if (!ready) return <div className="h-64 animate-pulse rounded-2xl bg-card" />;
  return user ? <GameHome name={user.email ?? "Spelare"} /> : <Landing />;
}

function Landing() {
  const features = [
    { icon: BookOpen, title: "Interaktiv handledning", text: "Sju kapitel som tar dig från noll till din första portfölj." },
    { icon: Swords, title: "Börsutmaningen", text: "Fatta beslut i simulerade marknader — från stadigt sparår till kraschande bubblor." },
    { icon: Trophy, title: "XP, karriär och ligor", text: "Gå från Nybörjare till Investeringsmästare och tävla med vänner." },
  ];
  return (
    <div className="grid gap-8">
      <section className="relative overflow-hidden rounded-3xl border border-border">
        <img src={heroImg} alt="Spelstad med glödande börstorn, guldmynt och en pokal" width={1536} height={768} className="h-72 w-full object-cover sm:h-96" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
          <GoldBadge>100 000 virtuella kronor</GoldBadge>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">Lär dig investera genom att spela</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">Bygg portföljer, klara börsutmaningar och samla XP — helt utan riktiga pengar.</p>
          <Button asChild size="lg" className="mt-5 h-14 px-8 text-lg font-extrabold tracking-wide"><Link to="/auth"><Play className="h-5 w-5" /> Börja spela</Link></Button>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        {features.map((f) => (
          <GameCard key={f.title}>
            <f.icon className="h-8 w-8 text-primary" />
            <h2 className="mt-3 text-lg font-bold">{f.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
          </GameCard>
        ))}
      </div>
      <p className="text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Endast simulering — inga riktiga pengar eller köp</p>
    </div>
  );
}

function GameHome({ name }: { name: string }) {
  const { data: home, isLoading, error, refetch } = useQuery({ queryKey: ["game-home"], queryFn: () => getHome() });
  const { data: periodic } = useQuery({ queryKey: ["periodic-missions"], queryFn: () => getPeriodicMissions() });
  const { data: leagues } = useQuery({ queryKey: ["my-leagues"], queryFn: () => getMyLeagues() });

  if (error) return <GameCard><p className="text-sm">Kunde inte ladda din spelstatus.</p><Button className="mt-3" variant="outline" onClick={() => refetch()}>Försök igen</Button></GameCard>;
  if (isLoading || !home) return <div className="grid gap-4"><div className="h-40 animate-pulse rounded-2xl bg-card" /><div className="h-64 animate-pulse rounded-2xl bg-card" /></div>;

  const lvl = levelOf(home.xp);
  const career = CAREER[careerLevel({ xp: home.xp, achievements: new Set(home.achievementCodes), missions: home.learningMissions })]!;
  const nextChapter = CHAPTERS.find((c) => !home.tutorialDone.includes(c.n));
  const nextScenario = SCENARIOS.find((s) => !home.challengesPassed.includes(s.id));
  const daily = (periodic?.missions ?? []).filter((m) => m.period === "daily");
  const openDaily = daily.find((m) => !m.claimed);
  const latest = home.latestAchievement ? ACHIEVEMENTS.find((a) => a.code === home.latestAchievement!.code) : null;
  const league = leagues?.[0];
  const myPos = league ? league.board.findIndex((b) => b.me) + 1 : 0;

  const play = nextChapter
    ? { to: "/tutorial/$chapter" as const, params: { chapter: String(nextChapter.n) }, label: `Kapitel ${nextChapter.n}: ${nextChapter.title}`, why: "Fortsätt handledningen — nästa steg mot din första portfölj." }
    : nextScenario
      ? { to: "/challenge/$id" as const, params: { id: nextScenario.id }, label: `Börsutmaning: ${nextScenario.title}`, why: "Testa dina kunskaper i en ny marknadssituation." }
      : { to: "/challenge" as const, params: {}, label: "Slå ditt rekord i Börsutmaningen", why: "Alla utmaningar klara — försök nå högre poäng." };

  return (
    <div className="grid gap-5">
      {/* Player header */}
      <GameCard glow="primary" className="p-6">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar name={name} level={lvl.level} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-extrabold">{career.badge} {career.title}</h1>
              <GoldBadge>Nivå {lvl.level}</GoldBadge>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <XpBar value={lvl.current} max={lvl.needed} className="flex-1" />
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{lvl.current}/{lvl.needed} XP</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Totalt {home.xp} XP</p>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-primary/30 bg-background/40 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
          <div>
            <CardLabel icon={<Sparkles className="h-3 w-3" />}>Rekommenderat härnäst</CardLabel>
            <div className="font-semibold">{play.label}</div>
            <p className="text-sm text-muted-foreground">{play.why}</p>
          </div>
          <Button asChild size="lg" className="mt-4 h-14 w-full px-10 text-lg font-extrabold tracking-widest shadow-lg sm:mt-0 sm:w-auto">
            <Link to={play.to} params={play.params}><Play className="h-5 w-5" /> SPELA NU</Link>
          </Button>
        </div>
      </GameCard>

      {/* Money + streak */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <GameCard><BigStat label="Portföljvärde" value={usd(home.portfolioUsd, 0)} sub={<span className={tone(home.returnPct)}>{signed(home.returnPct)} totalt</span>} /></GameCard>
        <GameCard><BigStat label="Kassa" value={usd(home.cashUsd, 0)} sub="Virtuella pengar" /></GameCard>
        <GameCard glow={home.streak > 0 ? "gold" : undefined}>
          <BigStat label="Studiestreak" value={<span className="flex items-center gap-1"><Flame className={home.streak ? "h-7 w-7 text-gold" : "h-7 w-7 text-muted-foreground"} />{home.streak}</span>} sub={home.streak === 1 ? "dag i rad" : "dagar i rad"} />
        </GameCard>
        <GameCard><BigStat label="Handledning" value={`${home.tutorialDone.length}/${CHAPTERS.length}`} sub="kapitel klara" /></GameCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Daily missions */}
        <GameCard>
          <CardLabel icon={<Target className="h-3 w-3" />}>Dagens uppdrag</CardLabel>
          <ul className="grid gap-2">
            {daily.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2 text-sm">
                <span className={m.claimed ? "text-muted-foreground line-through" : ""}>{m.title}</span>
                <span className={m.claimed ? "font-mono text-xs text-primary" : "font-mono text-xs text-gold"}>{m.claimed ? "✓" : `+${m.xp}`}</span>
              </li>
            ))}
            {!daily.length && <li className="text-sm text-muted-foreground">Laddar uppdrag…</li>}
          </ul>
          <Link to="/progress" className="mt-3 inline-flex items-center text-sm font-semibold text-primary">{openDaily ? "Gör uppdragen" : "Alla uppdrag"} <ChevronRight className="h-4 w-4" /></Link>
        </GameCard>

        {/* Active challenge */}
        <GameCard>
          <CardLabel icon={<Swords className="h-3 w-3" />}>Aktiv börsutmaning</CardLabel>
          {nextScenario ? (
            <>
              <div className="flex items-center gap-2"><h3 className="font-bold">{nextScenario.title}</h3><LevelPill level={nextScenario.level} /></div>
              <p className="mt-1 text-sm text-muted-foreground">{nextScenario.objective}</p>
              {home.bestByScenario[nextScenario.id] != null && <p className="mt-1 text-xs">Bästa poäng hittills: {home.bestByScenario[nextScenario.id]}</p>}
              <Link to="/challenge/$id" params={{ id: nextScenario.id }} className="mt-3 inline-flex items-center text-sm font-semibold text-primary">Starta <ChevronRight className="h-4 w-4" /></Link>
            </>
          ) : (
            <>
              <p className="text-sm">Du har klarat alla utmaningar! 🎉</p>
              <Link to="/challenge" className="mt-3 inline-flex items-center text-sm font-semibold text-primary">Spela igen <ChevronRight className="h-4 w-4" /></Link>
            </>
          )}
        </GameCard>

        {/* Latest achievement + league */}
        <div className="grid gap-4">
          <GameCard glow={latest ? "gold" : undefined}>
            <CardLabel icon={<Trophy className="h-3 w-3" />}>Senaste prestation</CardLabel>
            {latest ? (
              <div className="flex items-center gap-3"><span className="animate-pop text-3xl" aria-hidden>🏅</span><div><div className="font-bold">{latest.title}</div><div className="text-xs text-muted-foreground">{latest.desc}</div></div></div>
            ) : <p className="text-sm text-muted-foreground">Gör ditt första köp för att låsa upp en prestation.</p>}
          </GameCard>
          <GameCard>
            <CardLabel icon={<GraduationCap className="h-3 w-3" />}>Ligaplacering</CardLabel>
            {league ? (
              <div className="flex items-end justify-between"><div><div className="font-bold">{league.name}</div><div className="text-xs text-muted-foreground">{league.board.length} spelare</div></div><div className="font-mono text-3xl font-bold text-gold">#{myPos}</div></div>
            ) : <Link to="/leagues" className="text-sm font-semibold text-primary">Skapa eller gå med i en liga →</Link>}
          </GameCard>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { to: "/tutorial", label: "Handledning", icon: BookOpen },
          { to: "/challenge", label: "Börsutmaningen", icon: Swords },
          { to: "/screener", label: "Marknaden", icon: Sparkles },
          { to: "/portfolio", label: "Portfölj", icon: Wallet },
        ].map((l) => (
          <Link key={l.to} to={l.to} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm font-semibold transition-colors hover:border-primary/50">
            <l.icon className="h-4 w-4 text-primary" />{l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
