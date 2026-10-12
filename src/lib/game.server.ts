// Server-only game logic: quiz answers, deterministic scenario returns and scoring.
import { SCENARIOS, type ChallengeResult, type ReactionId, PASS_SCORE } from "./game";

export const CHAPTER_ANSWERS: Record<number, number> = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 2, 6: 0, 7: 1 };

/** Per-asset returns for each of the four rounds (fractions). Fixed data → same input, same outcome. */
const PATHS: Record<string, { returns: Record<string, number[]>; events: string[]; crashed: string }> = {
  "forsta-aret": {
    crashed: "tech",
    returns: {
      global: [0.03, -0.04, 0.05, 0.04],
      ranta: [0.008, 0.01, 0.008, 0.009],
      sverige: [0.04, -0.05, 0.06, 0.03],
      tech: [0.12, -0.28, 0.04, 0.06],
    },
    events: ["Kvartal 1: Stark start, teknik leder uppgången.", "Kvartal 2: Svaga rapporter — teknik rasar, breda fonder faller lite.", "Kvartal 3: Lugnet återvänder, svenska storbolag återhämtar sig.", "Kvartal 4: Stabil avslutning på året."],
  },
  inflationschock: {
    crashed: "tillvaxt",
    returns: {
      global: [-0.06, -0.09, 0.07, 0.08],
      ranta: [0.01, 0.015, 0.02, 0.02],
      energi: [0.25, 0.1, -0.12, -0.05],
      tillvaxt: [-0.2, -0.35, 0.1, 0.12],
      utdelning: [-0.02, -0.04, 0.05, 0.05],
    },
    events: ["Halvår 1: Räntehöjningar — tillväxtbolag faller kraftigt, energi stiger.", "Halvår 2: Börsen fortsätter ned. Korta räntor ger allt bättre avkastning.", "Halvår 3: Inflationen vänder ned. Energipriserna sjunker.", "Halvår 4: Breda marknaden återhämtar sig."],
  },
  bubblan: {
    crashed: "hype",
    returns: {
      global: [0.08, -0.15, 0.12, 0.1],
      ranta: [0.01, 0.02, 0.015, 0.015],
      hype: [0.6, -0.6, -0.2, 0.05],
      kvalitet: [0.06, -0.1, 0.12, 0.1],
      tillvaxtmarknad: [0.05, -0.2, 0.1, 0.12],
      guld: [-0.02, 0.1, 0.02, 0.01],
    },
    events: ["År 1 (del 1): Hypen fortsätter — RaketAI stiger ytterligare 60 %.", "År 1 (del 2): Bubblan spricker. Hypeaktien −60 %, börsen −15 %. Guld stiger.", "År 2: Kvalitetsbolag och breda fonder återhämtar sig. Hypeaktien fortsätter ned.", "År 3: Ny uppgång — tålamod lönade sig."],
  },
};

const LESSONS: Record<ReactionId, string> = {
  hold: "Du höll fast vid planen. Att inte sälja i panik är ett av de viktigaste besluten en investerare kan ta.",
  sell: "Du sålde efter fallet och missade återhämtningen. Panikförsäljning låser in förlusterna.",
  rebalance: "Du ombalanserade — du köpte det som blivit billigt och höll risken på planerad nivå. Klokt!",
  allin: "Du satsade allt på det som fallit mest. Det kan gå bra ibland, men det är vågspel och tar bort all spridning.",
};

export type ChallengeInput = { scenarioId: string; weights: Record<string, number>; reaction: ReactionId };

export function runChallenge(input: ChallengeInput): ChallengeResult | { error: string } {
  const sc = SCENARIOS.find((s) => s.id === input.scenarioId);
  const path = PATHS[input.scenarioId];
  if (!sc || !path) return { error: "Okänd utmaning" };
  const ids = sc.assets.map((a) => a.id);
  for (const k of Object.keys(input.weights)) if (!ids.includes(k)) return { error: "Okänd tillgång" };
  const w: Record<string, number> = {};
  for (const id of ids) {
    const v = input.weights[id] ?? 0;
    if (!Number.isFinite(v) || v < 0 || v > 100 || Math.round(v) !== v) return { error: "Ogiltig fördelning" };
    w[id] = v;
  }
  const total = Object.values(w).reduce((s, v) => s + v, 0);
  if (total !== 100) return { error: "Fördelningen måste bli exakt 100 %" };

  const risky = (id: string) => (sc.assets.find((a) => a.id === id)!.risk >= 3);
  const yearFrac = sc.period.startsWith("12") ? 1 : sc.period.startsWith("2") ? 2 : 3;
  let hold: Record<string, number> = Object.fromEntries(ids.map((id) => [id, (sc.budget * w[id]!) / 100]));
  let cash = 0;
  let fees = 0;
  const values: number[] = [];
  const value = () => cash + Object.values(hold).reduce((s, v) => s + v, 0);
  for (let r = 0; r < 4; r++) {
    if (r === 2) {
      const v = value();
      if (input.reaction === "sell") {
        for (const id of ids) if (risky(id)) { cash += hold[id]!; hold[id] = 0; }
      } else if (input.reaction === "rebalance") {
        hold = Object.fromEntries(ids.map((id) => [id, (v * w[id]!) / 100]));
      } else if (input.reaction === "allin") {
        hold = Object.fromEntries(ids.map((id) => [id, id === path.crashed ? v - cash : 0]));
      }
    }
    for (const id of ids) {
      const fee = hold[id]! * (sc.assets.find((a) => a.id === id)!.feePct / 100) * (yearFrac / 4);
      fees += fee;
      hold[id] = hold[id]! * (1 + path.returns[id]![r]!) - fee;
    }
    values.push(Math.round(value()));
  }

  const end = value();
  const riskLevel = sc.assets.reduce((s, a) => s + a.risk * w[a.id]!, 0) / 100;
  const maxWeight = Math.max(...Object.values(w));
  const holdings = Object.values(w).filter((v) => v >= 10).length;

  // Scoring rewards diversification and sensible risk — never reckless concentration.
  const divPts = Math.min(25, holdings * 7) + (maxWeight <= 40 ? 15 : maxWeight <= 60 ? 7 : 0);
  const [lo, hi] = sc.targetRisk;
  const dist = riskLevel < lo ? lo - riskLevel : riskLevel > hi ? riskLevel - hi : 0;
  const riskPts = Math.max(0, Math.round(25 - dist * 20));
  const reactPts = { hold: 15, rebalance: 20, sell: 5, allin: 0 }[input.reaction];
  const ret = end / sc.budget - 1;
  const retPts = Math.max(0, Math.min(15, Math.round(7 + ret * 40)));
  const weightedFee = sc.assets.reduce((s, a) => s + a.feePct * w[a.id]!, 0) / 100;
  const feeNote = weightedFee > 0.6 ? "Din genomsnittliga fondavgift var hög. Över lång tid äter avgifter en stor del av avkastningen." : "Låga avgifter — det lönar sig över tid.";

  const scoreParts = [
    { label: "Spridning", points: divPts, max: 40 },
    { label: "Rimlig risk", points: riskPts, max: 25 },
    { label: "Beslut vid oro", points: reactPts, max: 20 },
    { label: "Resultat", points: retPts, max: 15 },
  ];
  const score = scoreParts.reduce((s, p) => s + p.points, 0);
  const lessons = [
    LESSONS[input.reaction],
    holdings >= 3 && maxWeight <= 40 ? "Bra spridning: inget enskilt innehav kunde fälla hela portföljen." : "Portföljen var koncentrerad. Med bättre spridning hade ett enskilt ras slagit mindre hårt.",
    dist === 0 ? "Din risknivå passade målet för utmaningen." : riskLevel > hi ? "Risken var högre än målet krävde." : "Risken var lägre än målet — du kunde ha tagit lite mer risk för bättre avkastning.",
    feeNote,
  ];
  return {
    startValue: sc.budget, endValue: Math.round(end), returnPct: Math.round(ret * 1000) / 10, feesPaid: Math.round(fees),
    riskLevel: Math.round(riskLevel * 10) / 10, maxWeightPct: maxWeight, holdings, path: values,
    events: path.events, lessons, scoreParts, score, passed: score >= PASS_SCORE,
  };
}

export const CHALLENGE_XP = { Nybörjare: 60, Medel: 90, Avancerad: 120 } as const;

/** Consecutive Stockholm days (ending today or yesterday) with any activity. */
export function streakFrom(dates: string[], now = new Date()) {
  const day = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });
  const days = new Set(dates.map((d) => day(new Date(d))));
  let n = 0;
  const cur = new Date(now);
  if (!days.has(day(cur))) cur.setUTCDate(cur.getUTCDate() - 1);
  while (days.has(day(cur))) { n++; cur.setUTCDate(cur.getUTCDate() - 1); }
  return n;
}
