export const fmt = (n: number | null | undefined, d = 2) =>
  n == null || Number.isNaN(Number(n)) ? "—" : Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
export const usd = (n: number | null | undefined, d = 2) => (n == null ? "—" : `$${fmt(n, d)}`);
export const signed = (n: number | null | undefined, d = 2, suffix = "%") =>
  n == null ? "—" : `${Number(n) >= 0 ? "+" : ""}${fmt(n, d)}${suffix}`;
export const tone = (n: number | null | undefined) => (n == null ? "text-muted-foreground" : Number(n) >= 0 ? "text-bull" : "text-bear");
export const compact = (n: number | null | undefined) =>
  n == null ? "—" : Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(Number(n));
export function signalClass(sig: string | null | undefined) {
  if (!sig) return "text-muted-foreground border-border";
  if (sig.includes("BUY")) return "text-bull border-bull/40 bg-bull/10";
  if (sig.includes("SELL")) return "text-bear border-bear/40 bg-bear/10";
  return "text-muted-foreground border-border";
}
