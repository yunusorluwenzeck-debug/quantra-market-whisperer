import { createServerFn } from "@tanstack/react-start";
import { fetchStock } from "./market.server";

export type FundCategory = "Global index" | "Sverige index" | "Teknik" | "Tillväxtmarknader" | "Räntor" | "Blandfond";
export const FUNDS: { symbol: string; name: string; category: FundCategory; fee: number; about: string }[] = [
  { symbol: "VT", name: "Vanguard Total World Stock ETF", category: "Global index", fee: 0.06, about: "Äger tusentals bolag över hela världen. Mycket bred spridning till låg avgift." },
  { symbol: "ACWI", name: "iShares MSCI ACWI ETF", category: "Global index", fee: 0.32, about: "Stora och medelstora bolag i både utvecklade länder och tillväxtländer." },
  { symbol: "URTH", name: "iShares MSCI World ETF", category: "Global index", fee: 0.24, about: "Bolag i utvecklade länder, främst USA, Europa och Japan." },
  { symbol: "EWD", name: "iShares MSCI Sweden ETF", category: "Sverige index", fee: 0.54, about: "Följer de största svenska bolagen, t.ex. Investor, Atlas Copco och Volvo." },
  { symbol: "QQQ", name: "Invesco QQQ Trust", category: "Teknik", fee: 0.2, about: "De 100 största icke-finansiella bolagen på Nasdaq, tungt viktat mot teknik." },
  { symbol: "XLK", name: "Technology Select Sector SPDR", category: "Teknik", fee: 0.08, about: "Amerikanska teknikbolag i S&P 500. Hög koncentration i få bolag." },
  { symbol: "EEM", name: "iShares MSCI Emerging Markets ETF", category: "Tillväxtmarknader", fee: 0.7, about: "Bolag i t.ex. Kina, Indien, Taiwan och Brasilien. Högre risk och svängningar." },
  { symbol: "VWO", name: "Vanguard FTSE Emerging Markets ETF", category: "Tillväxtmarknader", fee: 0.08, about: "Bred exponering mot tillväxtländer till låg avgift." },
  { symbol: "BND", name: "Vanguard Total Bond Market ETF", category: "Räntor", fee: 0.03, about: "Amerikanska obligationer. Svänger oftast mindre än aktier." },
  { symbol: "AGG", name: "iShares Core US Aggregate Bond ETF", category: "Räntor", fee: 0.03, about: "Stat- och företagsobligationer av hög kvalitet." },
  { symbol: "AOR", name: "iShares Core Growth Allocation ETF", category: "Blandfond", fee: 0.15, about: "Cirka 60 % aktier och 40 % räntor — en färdig mix." },
  { symbol: "AOM", name: "iShares Core Moderate Allocation ETF", category: "Blandfond", fee: 0.15, about: "Cirka 40 % aktier och 60 % räntor — lägre risk." },
];

/** Real, delayed market data per fund (Yahoo Finance). Funds whose data fails are returned with `error`. */
export const getFunds = createServerFn({ method: "GET" }).handler(async () => {
  return Promise.all(
    FUNDS.map(async (f) => {
      try {
        const s = await fetchStock(f.symbol);
        const c = s.candles.map((x) => x.c);
        const back = (n: number) => (c.length > n ? (s.price / c[c.length - 1 - n]! - 1) * 100 : null);
        const vol = s.indicators.volatility;
        const risk = vol == null ? null : vol < 2 ? 1 : vol < 5 ? 2 : vol < 10 ? 3 : vol < 15 ? 4 : vol < 25 ? 5 : vol < 35 ? 6 : 7;
        return { ...f, price: s.price, currency: s.currency, changePct: s.changePct, r1m: back(21), r6m: back(126), r1y: back(c.length - 1),
          vol, risk, history: s.candles.map((x) => ({ t: x.t, c: x.c })), asOf: s.candles.at(-1)?.t ?? null, error: null as string | null };
      } catch {
        return { ...f, price: null, currency: "USD", changePct: null, r1m: null, r6m: null, r1y: null, vol: null, risk: null, history: [], asOf: null, error: "Data saknas just nu" };
      }
    }),
  );
});
