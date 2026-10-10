// Live USD→SEK rate, set by the app shell. Until it loads, amounts show in USD (never a made-up rate).
let sekPerUsd: number | null = null;
export const setSekRate = (r: number | null) => { sekPerUsd = r; };
export const fmt = (n: number | null | undefined, d = 2) =>
  n == null || Number.isNaN(Number(n)) ? "—" : Number(n).toLocaleString("sv-SE", { minimumFractionDigits: d, maximumFractionDigits: d });
export const usd = (n: number | null | undefined, d = 2) =>
  n == null ? "—" : sekPerUsd ? `${fmt(Number(n) * sekPerUsd, d)} kr` : `$${fmt(n, d)}`;
export const signed = (n: number | null | undefined, d = 2, suffix = "%") =>
  n == null ? "—" : `${Number(n) >= 0 ? "+" : ""}${fmt(n, d)}${suffix}`;
export const tone = (n: number | null | undefined) => (n == null ? "text-muted-foreground" : Number(n) >= 0 ? "text-bull" : "text-bear");
export const compact = (n: number | null | undefined) =>
  n == null ? "—" : Intl.NumberFormat("sv-SE", { notation: "compact", maximumFractionDigits: 1 }).format(Number(n));
export function signalClass(sig: string | null | undefined) {
  if (!sig) return "text-muted-foreground border-border";
  if (sig.includes("BUY")) return "text-bull border-bull/40 bg-bull/10";
  if (sig.includes("SELL")) return "text-bear border-bear/40 bg-bear/10";
  return "text-muted-foreground border-border";
}
