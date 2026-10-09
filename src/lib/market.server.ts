export type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };
export type StockData = {
  symbol: string;
  name: string;
  currency: string;
  exchange: string;
  price: number;
  prevClose: number;
  change: number;
  changePct: number;
  candles: Candle[];
  indicators: Indicators;
};
export type Indicators = {
  sma20: number | null;
  sma50: number | null;
  rsi14: number | null;
  volatility: number | null; // annualized %
  high52: number;
  low52: number;
  momentum1m: number | null; // %
};

const sma = (a: number[], n: number) =>
  a.length < n ? null : a.slice(-n).reduce((s, x) => s + x, 0) / n;

function rsi(c: number[], n = 14) {
  if (c.length <= n) return null;
  let g = 0, l = 0;
  for (let i = c.length - n; i < c.length; i++) {
    const d = c[i] - c[i - 1];
    if (d > 0) g += d; else l -= d;
  }
  if (l === 0) return 100;
  return 100 - 100 / (1 + g / l);
}

export async function fetchStock(symbol: string): Promise<StockData> {
  const sym = symbol.trim().toUpperCase();
  if (!/^[A-Z0-9.\-^=]{1,15}$/.test(sym)) throw new Error("Invalid ticker");
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1y&interval=1d`,
    { headers: { "User-Agent": "Mozilla/5.0" } },
  );
  if (!res.ok) throw new Error(res.status === 404 ? `Ticker ${sym} not found` : "Market data unavailable");
  const json = (await res.json()) as any;
  const r = json?.chart?.result?.[0];
  if (!r) throw new Error(`Ticker ${sym} not found`);
  const q = r.indicators.quote[0];
  const candles: Candle[] = (r.timestamp ?? [])
    .map((t: number, i: number) => ({ t: t * 1000, o: q.open[i], h: q.high[i], l: q.low[i], c: q.close[i], v: q.volume[i] }))
    .filter((x: Candle) => x.c != null);
  const closes = candles.map((x) => x.c);
  const price = r.meta.regularMarketPrice ?? closes.at(-1);
  const prevClose = closes.length > 1 ? closes.at(-2)! : price;
  const rets = closes.slice(-60).map((c, i, a) => (i ? Math.log(c / a[i - 1]) : 0)).slice(1);
  const mean = rets.reduce((s, x) => s + x, 0) / (rets.length || 1);
  const sd = Math.sqrt(rets.reduce((s, x) => s + (x - mean) ** 2, 0) / (rets.length || 1));
  return {
    symbol: sym,
    name: r.meta.longName ?? r.meta.shortName ?? sym,
    currency: r.meta.currency ?? "USD",
    exchange: r.meta.fullExchangeName ?? r.meta.exchangeName ?? "",
    price,
    prevClose,
    change: price - prevClose,
    changePct: ((price - prevClose) / prevClose) * 100,
    candles,
    indicators: {
      sma20: sma(closes, 20),
      sma50: sma(closes, 50),
      rsi14: rsi(closes),
      volatility: rets.length ? sd * Math.sqrt(252) * 100 : null,
      high52: Math.max(...candles.map((x) => x.h ?? x.c)),
      low52: Math.min(...candles.map((x) => x.l ?? x.c)),
      momentum1m: closes.length > 21 ? ((price - closes.at(-22)!) / closes.at(-22)!) * 100 : null,
    },
  };
}
