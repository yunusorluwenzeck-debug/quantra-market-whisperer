import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getFunds } from "@/lib/funds.functions";
import { Card } from "@/components/AppShell";
import { fmt, signed, tone, usd } from "@/lib/format";

const fundsQuery = queryOptions({ queryKey: ["funds"], queryFn: () => getFunds(), staleTime: 15 * 60_000 });

export const Route = createFileRoute("/fonder")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Fonder — jämför avkastning, avgift och risk | StockLab" },
      { name: "description", content: "Jämför globala, svenska, teknik-, tillväxt-, ränte- och blandfonder. Lär dig om avgifter, risk och ränta på ränta." },
      { property: "og:title", content: "Fonder — jämför avkastning, avgift och risk | StockLab" },
      { property: "og:description", content: "Jämför fonder och lär dig om avgifter, risk och långsiktigt sparande." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(fundsQuery),
  component: Fonder,
});

const CATS = ["Alla", "Global index", "Sverige index", "Teknik", "Tillväxtmarknader", "Räntor", "Blandfond"] as const;

function fmtDelay(marketTime: number | null, fetchedAt: number) {
  if (!marketTime) return "okänd fördröjning";
  const min = Math.max(0, Math.round((fetchedAt - marketTime) / 60_000));
  if (min < 1) return "utan märkbar fördröjning";
  if (min < 60) return `ca ${min} min fördröjd`;
  const h = Math.floor(min / 60);
  return h < 24 ? `ca ${h} tim fördröjd (börsen kan vara stängd)` : "börsen stängd — senaste stängningskurs";
}

const LEARN = [
  ["Spridning", "En fond äger många bolag. Går ett bolag dåligt påverkar det bara en liten del av dina pengar."],
  ["Avgifter", "Avgiften dras varje år. 1 % i stället för 0,1 % kan äta upp en stor del av vinsten på 30 år."],
  ["Risk", "Risknivå 1–7 visar hur mycket fonden brukar svänga. Högre risk kan ge högre avkastning — men också större förluster."],
  ["Långsiktighet", "Börsen går upp och ner. Den som sparar länge hinner oftast återhämta sig från nedgångar."],
  ["Ränta på ränta", "Avkastningen ger i sin tur avkastning. 1 000 kr i månaden i 30 år med 7 % per år blir ungefär 1,2 miljoner kr."],
  ["Aktie eller fond?", "En aktie är en del av ett bolag. En fond är en korg med många aktier eller räntor — mindre risk än enskilda aktier."],
] as const;

function Fonder() {
  const { data } = useSuspenseQuery(fundsQuery);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATS)[number]>("Alla");
  const [sel, setSel] = useState(data[0]?.symbol ?? "");
  const list = useMemo(() => data.filter((f) => (cat === "Alla" || f.category === cat) && (f.name + f.symbol).toLowerCase().includes(q.toLowerCase())), [data, q, cat]);
  const f = data.find((x) => x.symbol === sel) ?? list[0];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">Fonder <span className="ml-2 rounded border border-border px-2 py-0.5 align-middle font-mono text-[10px] text-muted-foreground">FÖRDRÖJD DATA</span></h1>
        <p className="text-sm text-muted-foreground">Börshandlade fonder (ETF:er) med riktiga, fördröjda kurser från Yahoo Finance. Belopp i kronor. Handel sker bara med virtuella pengar.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sök fond eller ticker" className="w-56 rounded-md border border-input bg-card px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        {CATS.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`rounded-full border px-3 py-1 text-xs ${cat === c ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>{c}</button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] [&>*]:min-w-0">
        <Card title={`Fondlista (${list.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead className="text-left text-[10px] uppercase text-muted-foreground"><tr className="border-b border-border"><th className="px-3 py-2 sm:px-4">Fond</th><th className="px-2 text-right">Kurs</th><th className="px-2 text-right">Idag</th><th className="px-2 text-right">1 år</th><th className="hidden px-2 text-right sm:table-cell">Avgift</th><th className="hidden px-2 text-right sm:table-cell">Risk</th><th className="hidden px-4 text-right md:table-cell">Uppdaterad</th></tr></thead>
              <tbody>
                {list.map((x) => (
                  <tr key={x.symbol} onClick={() => setSel(x.symbol)} className={`cursor-pointer border-b border-border/50 hover:bg-accent/50 ${x.symbol === f?.symbol ? "bg-accent/60" : ""}`}>
                    <td className="px-3 py-2 sm:px-4"><div className="font-semibold">{x.symbol}</div><div className="font-sans text-[11px] text-muted-foreground">{x.category}</div><div className="font-sans text-[10px] text-muted-foreground sm:hidden">Avgift {fmt(x.fee)} % · Risk {x.risk ?? "—"}/7</div></td>
                    <td className="whitespace-nowrap px-2 text-right">{usd(x.price)}</td>
                    <td className={`whitespace-nowrap px-2 text-right ${tone(x.changePct)}`}>{signed(x.changePct)}</td>
                    <td className={`whitespace-nowrap px-2 text-right ${tone(x.r1y)}`}>{signed(x.r1y, 1)}</td>
                    <td className="hidden whitespace-nowrap px-2 text-right sm:table-cell">{fmt(x.fee)} %</td>
                    <td className="hidden whitespace-nowrap px-2 text-right sm:table-cell">{x.risk ?? "—"}/7</td>
                    <td className="hidden px-4 text-right font-sans text-[11px] text-muted-foreground md:table-cell">
                      {x.marketTime ? (<>{new Date(x.marketTime).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" })}<div className="text-[10px]">{fmtDelay(x.marketTime, x.fetchedAt)}</div></>) : "—"}
                    </td>
                  </tr>
                ))}
                {!list.length && <tr><td colSpan={7} className="p-4 font-sans text-sm text-muted-foreground">Inga fonder matchar.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        {f && (
          <Card title="Fonddetaljer">
            <div className="grid gap-3 p-4">
              <div>
                <div className="text-lg font-bold">{f.name}</div>
                <div className="font-mono text-xs text-muted-foreground">{f.symbol} · {f.category}</div>
              </div>
              <p className="text-sm">{f.about}</p>
              {f.error ? <p className="text-sm text-bear">{f.error} — inga kurser visas hellre än gissade.</p> : (
                <>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={f.history}>
                        <XAxis dataKey="t" hide /><YAxis domain={["auto", "auto"]} hide />
                        <Tooltip labelFormatter={(t) => new Date(Number(t)).toLocaleDateString("sv-SE")} formatter={(v) => [usd(Number(v)), "Kurs"]} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                        <Area dataKey="c" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.15} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                    {[["1 mån", f.r1m], ["6 mån", f.r6m], ["1 år", f.r1y]].map(([k, v]) => (
                      <div key={k as string} className="rounded-lg border border-border p-2"><div className="text-[10px] uppercase text-muted-foreground">{k}</div><div className={tone(v as number)}>{signed(v as number, 1)}</div></div>
                    ))}
                    <div className="rounded-lg border border-border p-2"><div className="text-[10px] uppercase text-muted-foreground">Avgift/år</div>{fmt(f.fee)} %</div>
                    <div className="rounded-lg border border-border p-2"><div className="text-[10px] uppercase text-muted-foreground">Volatilitet</div>{fmt(f.vol, 1)} %</div>
                    <div className="rounded-lg border border-border p-2"><div className="text-[10px] uppercase text-muted-foreground">Risk</div>{f.risk ?? "—"}/7</div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Kursen uppdaterades {f.marketTime ? new Date(f.marketTime).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" }) : "okänd tid"} — {fmtDelay(f.marketTime, f.fetchedAt)}. Hämtad från Yahoo Finance {new Date(f.fetchedAt).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" })}. Risknivån är uppskattad från de senaste 60 dagarnas svängningar. Avgiften är senast kända från utgivaren — kontrollera alltid aktuell avgift. 10 000 kr i ett år kostar ungefär {fmt(100 * f.fee, 0)} kr i avgift.
                  </p>
                  <Link to="/stock/$symbol" params={{ symbol: f.symbol }} className="rounded-md bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground">Köp eller sälj virtuellt</Link>
                </>
              )}
            </div>
          </Card>
        )}
      </div>

      <Card title="Lär dig om fonder">
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {LEARN.map(([t, d]) => (
            <div key={t}><div className="font-semibold text-primary">{t}</div><p className="mt-1 text-sm text-muted-foreground">{d}</p></div>
          ))}
        </div>
      </Card>
      <p className="text-xs text-muted-foreground">Historisk avkastning är ingen garanti för framtida avkastning. Detta är ett utbildningsspel, inte finansiell rådgivning.</p>
    </div>
  );
}
