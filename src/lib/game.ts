// Client-safe game content: tutorial chapters and market-challenge scenarios.
// Quiz answers and scenario price paths live only in game.server.ts.

export type Exercise = "compound" | "pick-stock" | "real-trade" | "fees" | "spread" | "risk" | "challenge";

export type Chapter = {
  n: number;
  title: string;
  tagline: string;
  objective: string;
  explain: string[];
  exercise: Exercise;
  question: string;
  options: string[];
  xp: number;
};

export const CHAPTERS: Chapter[] = [
  { n: 1, title: "Dina första 100 000 kronor", tagline: "Startkapitalet", xp: 30, exercise: "compound",
    objective: "Förstå hur pengar kan växa över tid.",
    explain: [
      "Du får 100 000 virtuella kronor att öva med. Inget av det är riktiga pengar — här kan du göra misstag helt utan risk.",
      "Pengar som investeras kan växa genom ränta på ränta: avkastningen återinvesteras och ger själv avkastning.",
      "Tid är den viktigaste ingrediensen. Ju längre pengarna får växa, desto större blir effekten.",
    ],
    question: "Vad behöver ränta på ränta mest?", options: ["Tur", "Tid", "Många snabba affärer"] },
  { n: 2, title: "Vad är en aktie?", tagline: "Äg en bit av ett bolag", xp: 30, exercise: "pick-stock",
    objective: "Förstå vad du faktiskt köper när du köper en aktie.",
    explain: [
      "En aktie är en liten ägarandel i ett bolag. Äger du en Volvo-aktie äger du en mycket liten del av Volvo.",
      "Om bolaget växer och tjänar mer pengar brukar aktien bli mer värd. Går det dåligt kan den falla — ibland mycket.",
      "Många bolag delar ut en del av vinsten till ägarna. Det kallas utdelning.",
    ],
    question: "Vad får du när du köper en aktie?", options: ["Ett lån till bolaget", "En ägarandel i bolaget", "En garanterad ränta"] },
  { n: 3, title: "Köp din första aktie", tagline: "Dags att handla", xp: 50, exercise: "real-trade",
    objective: "Gör ett riktigt virtuellt köp i din portfölj.",
    explain: [
      "Nu gör du ett köp på riktigt — med virtuella pengar. Gå till Marknaden, välj ett bolag och köp för ett mindre belopp.",
      "Börja smått. Ett första köp på några tusen kronor räcker gott för att lära sig hur det fungerar.",
      "Kapitlet låses upp när ditt köp syns i portföljen.",
    ],
    question: "Vad är klokt vid ditt första köp?", options: ["Satsa allt på en gång", "Börja med ett mindre belopp", "Köpa den aktie som stigit mest idag"] },
  { n: 4, title: "Vad är en fond?", tagline: "Många bolag i ett köp", xp: 30, exercise: "fees",
    objective: "Förstå fonder och varför avgiften spelar roll.",
    explain: [
      "En fond samlar pengar från många sparare och köper många olika värdepapper. Med ett enda köp äger du en bit av hundratals bolag.",
      "En indexfond följer ett helt index, till exempel hela världens börser, och har ofta mycket låg avgift.",
      "Avgiften dras varje år. Skillnaden mellan 0,2 % och 1,5 % blir enorm över lång tid.",
    ],
    question: "Vilken fond är oftast billigast att äga länge?", options: ["Aktivt förvaltad fond, 1,5 %", "Global indexfond, 0,2 %", "Avgiften spelar ingen roll"] },
  { n: 5, title: "Bygg en spridd portfölj", tagline: "Lägg inte alla ägg i samma korg", xp: 30, exercise: "spread",
    objective: "Fördela pengar så att ett enskilt bakslag inte fäller hela portföljen.",
    explain: [
      "Diversifiering betyder att sprida pengarna på olika bolag, branscher, länder och tillgångsslag.",
      "När ett innehav går dåligt kan andra gå bra. Det gör portföljens värde jämnare.",
      "En bra tumregel för nybörjare: inget enskilt innehav bör vara mer än 25–30 % av portföljen.",
    ],
    question: "Vilken portfölj är bäst spridd?", options: ["100 % i en teknikaktie", "50 % i två teknikaktier", "Global fond, räntefond och några olika aktier"] },
  { n: 6, title: "Förstå risk", tagline: "Svängningar hör till", xp: 30, exercise: "risk",
    objective: "Förstå sambandet mellan möjlig avkastning och risk.",
    explain: [
      "Risk betyder att värdet kan svänga — och att du kan förlora pengar. Högre möjlig avkastning kommer nästan alltid med högre risk.",
      "Räntefonder svänger lite. Globala aktiefonder svänger mer. Enskilda småbolag kan svänga väldigt mycket.",
      "Välj en risknivå du kan stå ut med även när börsen faller, så att du inte säljer i panik.",
    ],
    question: "Vad gör ofta störst skada när börsen faller kraftigt?", options: ["Att sälja allt i panik", "Att behålla en spridd portfölj", "Att ha en del i räntefonder"] },
  { n: 7, title: "Din första börsutmaning", tagline: "Slutprovet", xp: 50, exercise: "challenge",
    objective: "Klara en börsutmaning i spelläget Börsutmaningen.",
    explain: [
      "Nu sätter du allt du lärt dig på prov. I Börsutmaningen får du en budget, ett mål och en marknad som förändras.",
      "Du väljer hur pengarna ska fördelas och hur du reagerar när något oväntat händer.",
      "Poängen belönar god spridning och rimlig risk — inte vågspel. Kapitlet låses upp när du klarat valfri utmaning.",
    ],
    question: "Vad belönas mest i Börsutmaningen?", options: ["Att satsa allt på en aktie", "Spridning och rimlig risk", "Att handla så ofta som möjligt"] },
];

export const tutorialCode = (n: number) => `t:${n}`;

// ---- Market challenge scenarios (public part) ----

export type ScenarioAsset = { id: string; name: string; kind: string; risk: 1 | 2 | 3 | 4 | 5; feePct: number; info: string };
export type Scenario = {
  id: string;
  level: "Nybörjare" | "Medel" | "Avancerad";
  title: string;
  budget: number; // SEK, virtual
  period: string;
  rounds: string[]; // names of the four simulated periods
  objective: string;
  targetRisk: [number, number]; // acceptable weighted risk range (1–5)
  briefing: string[];
  midEvent: string; // shown after round 2, player must react
  assets: ScenarioAsset[];
};

export const SCENARIOS: Scenario[] = [
  { id: "forsta-aret", level: "Nybörjare", title: "Första sparåret", budget: 50_000, period: "12 månader",
    rounds: ["Kvartal 1", "Kvartal 2", "Kvartal 3", "Kvartal 4"],
    objective: "Väx pengarna stabilt under ett år med måttlig risk. Undvik stora förluster.",
    targetRisk: [2, 3.2],
    briefing: ["Börsen har gått stadigt uppåt det senaste året.", "Räntorna är oförändrade och inflationen är låg.", "Teknikbolagen har blivit dyra efter en stark period."],
    midEvent: "Mitt i året faller teknikaktier 15 % på en vecka efter svaga rapporter. Rubrikerna talar om ”börsras”. Vad gör du?",
    assets: [
      { id: "global", name: "Global indexfond", kind: "Fond", risk: 3, feePct: 0.2, info: "Äger 1 500+ bolag i hela världen." },
      { id: "ranta", name: "Räntefond", kind: "Fond", risk: 1, feePct: 0.15, info: "Lånar ut till stater och bolag. Låg svängning." },
      { id: "sverige", name: "Sverigefond", kind: "Fond", risk: 3, feePct: 0.3, info: "Svenska storbolag som Volvo, Atlas Copco och Investor." },
      { id: "tech", name: "TechGiganten AB", kind: "Aktie", risk: 5, feePct: 0, info: "Populär teknikaktie som stigit 80 % i år." },
    ] },
  { id: "inflationschock", level: "Medel", title: "Inflationschocken", budget: 100_000, period: "2 år",
    rounds: ["Halvår 1", "Halvår 2", "Halvår 3", "Halvår 4"],
    objective: "Skydda köpkraften när inflation och räntor stiger. Balansera risk och avkastning.",
    targetRisk: [2.2, 3.5],
    briefing: ["Inflationen har stigit till 6 % och centralbanken signalerar höjda räntor.", "Energipriserna är höga.", "Tillväxtbolag med låg vinst handlas fortfarande dyrt."],
    midEvent: "Centralbanken höjer räntan tre gånger på kort tid. Börsen har fallit 18 % från toppen. Vad gör du?",
    assets: [
      { id: "global", name: "Global indexfond", kind: "Fond", risk: 3, feePct: 0.2, info: "Bred världsfond." },
      { id: "ranta", name: "Kort räntefond", kind: "Fond", risk: 1, feePct: 0.15, info: "Korta lån — gynnas när räntan stiger." },
      { id: "energi", name: "Energibolaget AB", kind: "Aktie", risk: 4, feePct: 0, info: "Olje- och gasbolag med stora vinster just nu." },
      { id: "tillvaxt", name: "Tillväxtfonden", kind: "Fond", risk: 5, feePct: 1.4, info: "Olönsamma snabbväxande bolag. Hög avgift." },
      { id: "utdelning", name: "Utdelningsfond", kind: "Fond", risk: 2, feePct: 0.4, info: "Stabila bolag med jämna utdelningar." },
    ] },
  { id: "bubblan", level: "Avancerad", title: "Hypebubblan", budget: 200_000, period: "3 år",
    rounds: ["År 1, del 1", "År 1, del 2", "År 2", "År 3"],
    objective: "Klara en spekulationsbubbla och dess krasch utan att förlora fokus på långsiktighet.",
    targetRisk: [2.4, 3.6],
    briefing: ["Ett nytt teknikområde har gjort vissa aktier 10 gånger dyrare på ett år.", "Vänner och sociala medier pratar bara om ”nästa raket”.", "Värderingarna saknar täckning i bolagens vinster."],
    midEvent: "Bubblan spricker: hypeaktierna faller 60 % på några månader och hela börsen dras med. Vad gör du?",
    assets: [
      { id: "global", name: "Global indexfond", kind: "Fond", risk: 3, feePct: 0.2, info: "Bred världsfond." },
      { id: "ranta", name: "Räntefond", kind: "Fond", risk: 1, feePct: 0.15, info: "Stabil buffert." },
      { id: "hype", name: "RaketAI Inc", kind: "Aktie", risk: 5, feePct: 0, info: "Har stigit 900 % på ett år. Ingen vinst." },
      { id: "kvalitet", name: "Kvalitetsbolagen", kind: "Fond", risk: 3, feePct: 0.5, info: "Lönsamma bolag med låg skuld." },
      { id: "tillvaxtmarknad", name: "Tillväxtmarknadsfond", kind: "Fond", risk: 4, feePct: 0.35, info: "Bolag i Asien, Latinamerika och Afrika." },
      { id: "guld", name: "Guldfond", kind: "Fond", risk: 3, feePct: 0.4, info: "Följer guldpriset. Brukar hålla emot vid oro." },
    ] },
];

export const REACTIONS = [
  { id: "hold", label: "Behåll planen", desc: "Låt portföljen ligga kvar som den är." },
  { id: "sell", label: "Sälj allt riskfyllt", desc: "Flytta alla aktier och aktiefonder till kontanter." },
  { id: "rebalance", label: "Ombalansera", desc: "Återställ den ursprungliga fördelningen genom att köpa det som fallit." },
  { id: "allin", label: "Satsa allt på det som fallit mest", desc: "Lägg hela portföljen i den tillgång som rasat." },
] as const;
export type ReactionId = (typeof REACTIONS)[number]["id"];

export const challengeCode = (id: string) => `c:${id}`;

export type ChallengeResult = {
  startValue: number;
  endValue: number;
  returnPct: number;
  feesPaid: number;
  riskLevel: number;
  maxWeightPct: number;
  holdings: number;
  path: number[]; // portfolio value after each round
  events: string[];
  lessons: string[];
  scoreParts: { label: string; points: number; max: number }[];
  score: number;
  passed: boolean;
};

export const PASS_SCORE = 60;
