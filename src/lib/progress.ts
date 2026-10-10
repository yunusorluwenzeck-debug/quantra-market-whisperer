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
