// Shared (client-safe) definitions for XP, levels, achievements and learning missions.
// Quiz answers live only in progress.server.ts so the browser can't read them.

export type Facts = { trades: number; sells: number; profitableSells: number; holdings: number; fundHoldings: number; alerts: number; lists: number };

export const FUND_SYMBOLS = ["VT", "ACWI", "URTH", "EWD", "QQQ", "XLK", "EEM", "VWO", "BND", "AGG", "AOR", "AOM"];

export const ACHIEVEMENTS: { code: string; title: string; desc: string; xp: number; test: (f: Facts) => boolean }[] = [
  { code: "first_trade", title: "Första affären", desc: "Gör ditt första virtuella köp.", xp: 50, test: (f) => f.trades >= 1 },
  { code: "first_sell", title: "Hem med vinsten?", desc: "Sälj ett innehav för första gången.", xp: 50, test: (f) => f.sells >= 1 },
  { code: "profit", title: "I plus", desc: "Sälj ett innehav med vinst.", xp: 100, test: (f) => f.profitableSells >= 1 },
  { code: "ten_trades", title: "Aktiv handlare", desc: "Gör 10 virtuella affärer.", xp: 100, test: (f) => f.trades >= 10 },
  { code: "diversified", title: "Spridd risk", desc: "Äg minst 5 olika innehav samtidigt.", xp: 150, test: (f) => f.holdings >= 5 },
  { code: "fund_owner", title: "Fondsparare", desc: "Äg minst en fond.", xp: 75, test: (f) => f.fundHoldings >= 1 },
  { code: "alert_set", title: "Vaksam", desc: "Sätt ett kurslarm.", xp: 25, test: (f) => f.alerts >= 1 },
  { code: "list_made", title: "Organiserad", desc: "Skapa en egen lista.", xp: 25, test: (f) => f.lists >= 1 },
];

export const MISSIONS: { code: string; title: string; lesson: string; question: string; options: string[]; xp: number }[] = [
  { code: "diversify", title: "Sprid riskerna", xp: 60,
    lesson: "Om du äger många olika bolag påverkas du mindre när ett enskilt bolag går dåligt. En indexfond äger hundratals bolag på en gång.",
    question: "Vad minskar risken mest?", options: ["Allt i ett bolag", "Många olika bolag", "Köpa och sälja ofta"] },
  { code: "fees", title: "Avgifter spelar roll", xp: 60,
    lesson: "En årlig avgift på 1,5 % i stället för 0,2 % kan äta upp en stor del av avkastningen över 30 år, eftersom avgiften dras varje år.",
    question: "Vilken fond är billigast att äga länge?", options: ["Avgift 1,5 %", "Avgift 0,2 %", "Spelar ingen roll"] },
  { code: "compound", title: "Ränta på ränta", xp: 60,
    lesson: "När avkastningen återinvesteras växer även den. 7 % per år fördubblar ungefär pengarna på 10 år.",
    question: "Vad behöver ränta på ränta mest?", options: ["Tid", "Tur", "Många affärer"] },
  { code: "risk", title: "Risk och svängningar", xp: 60,
    lesson: "Aktier svänger mer än räntefonder. Högre möjlig avkastning kommer nästan alltid med större risk att förlora.",
    question: "Vad svänger oftast minst?", options: ["Teknikaktier", "Tillväxtmarknader", "Räntefonder"] },
];

export const xpForLevel = (level: number) => 100 * (level - 1) * level / 2; // 0,100,300,600...
export function levelOf(xp: number) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return { level, current: xp - xpForLevel(level), needed: xpForLevel(level + 1) - xpForLevel(level) };
}

/** Career titles unlock through learning and sound habits — never through trading volume or raw returns. */
export type CareerInput = { xp: number; achievements: Set<string>; missions: number };
export const CAREER: { title: string; unlock: string; badge: string; reqs: { label: string; ok: (c: CareerInput) => boolean }[] }[] = [
  { title: "Nybörjare", badge: "🌱", unlock: "Grundlektionerna", reqs: [] },
  { title: "Sparare", badge: "💰", unlock: "Märket Sparare", reqs: [
    { label: "Klara 1 lärandeuppdrag", ok: (c) => c.missions >= 1 },
    { label: "Gör din första virtuella affär", ok: (c) => c.achievements.has("first_trade") } ] },
  { title: "Fondutforskare", badge: "🧭", unlock: "Fondutmaningar", reqs: [
    { label: "Klara 2 lärandeuppdrag", ok: (c) => c.missions >= 2 },
    { label: "Äg minst en fond", ok: (c) => c.achievements.has("fund_owner") } ] },
  { title: "Marknadsanalytiker", badge: "📊", unlock: "Analysverktyg i fokus", reqs: [
    { label: "Klara 3 lärandeuppdrag", ok: (c) => c.missions >= 3 },
    { label: "Skapa en egen bevakningslista", ok: (c) => c.achievements.has("list_made") },
    { label: "Sätt ett kurslarm", ok: (c) => c.achievements.has("alert_set") } ] },
  { title: "Portföljstrateg", badge: "🧩", unlock: "Märket Strateg", reqs: [
    { label: "Klara alla lärandeuppdrag", ok: (c) => c.missions >= MISSIONS.length },
    { label: "Äg minst 5 olika innehav samtidigt", ok: (c) => c.achievements.has("diversified") } ] },
  { title: "Riskexpert", badge: "🛡️", unlock: "Märket Riskexpert", reqs: [
    { label: "Sälj ett innehav med vinst", ok: (c) => c.achievements.has("profit") },
    { label: "Nå 600 XP", ok: (c) => c.xp >= 600 } ] },
  { title: "Investeringsmästare", badge: "🏆", unlock: "Mästarmärket", reqs: [
    { label: "Nå 800 XP", ok: (c) => c.xp >= 800 } ] },
];
/** Index of the highest career level whose requirements (and all earlier ones) are met. */
export function careerLevel(c: CareerInput) {
  let i = 0;
  while (i + 1 < CAREER.length && CAREER[i + 1]!.reqs.every((r) => r.ok(c))) i++;
  return i;
}

/** Daily and weekly goals. Periods are Stockholm calendar days and ISO weeks (Mon–Sun). */
export type PeriodicMission = { id: string; period: "daily" | "weekly"; title: string; desc: string; xp: number; quiz?: boolean };
export const PERIODIC: PeriodicMission[] = [
  { id: "quiz", period: "daily", title: "Dagens fråga", desc: "Svara rätt på dagens kunskapsfråga.", xp: 20, quiz: true },
  { id: "trade", period: "daily", title: "Gör en genomtänkt affär", desc: "Gör minst en virtuell affär idag.", xp: 15 },
  { id: "alert", period: "daily", title: "Bevaka en aktie", desc: "Sätt ett kurslarm idag.", xp: 10 },
  { id: "spread", period: "weekly", title: "Sprid riskerna", desc: "Äg minst 3 olika innehav samtidigt.", xp: 50 },
  { id: "fund", period: "weekly", title: "Fondsparare", desc: "Äg minst en fond i portföljen.", xp: 40 },
  { id: "calm", period: "weekly", title: "Lugn och fin", desc: "Gör 1–10 affärer denna vecka — inte fler. Kvalitet före kvantitet.", xp: 40 },
  { id: "quiz5", period: "weekly", title: "Plugghäst", desc: "Svara rätt på dagens fråga 3 dagar denna vecka.", xp: 60 },
];
/** Codes that are not classic learning missions: daily/weekly ("d:"/"w:"), tutorial chapters ("t:") and market challenges ("c:"). */
export const isPeriodicCode = (code: string) => /^[dwtc]:/.test(code);
