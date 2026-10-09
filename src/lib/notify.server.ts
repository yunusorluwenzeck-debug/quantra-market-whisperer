import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GW = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const SOURCE = "Yahoo Finance daily prices (delayed), Quantra quant model";

function headers() {
  const lk = process.env["LOVABLE_API_KEY"], gk = process.env["GOOGLE_MAIL_API_KEY"];
  if (!lk || !gk) throw new Error("Gmail is not connected");
  return { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": gk, "Content-Type": "application/json" };
}

export async function gmailAddress(): Promise<string> {
  const r = await fetch(`${GW}/users/me/profile`, { headers: headers() });
  if (!r.ok) throw new Error(`Gmail profile failed [${r.status}]: ${(await r.text()).slice(0, 200)}`);
  return ((await r.json()) as { emailAddress: string }).emailAddress;
}

const b64 = (s: string) => btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));
const hdr = (v: string) => (/^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);

export async function sendEmail(subject: string, body: string) {
  const to = await gmailAddress();
  const raw = b64([`To: ${to}`, `Subject: ${hdr(subject)}`, "MIME-Version: 1.0", 'Content-Type: text/plain; charset="UTF-8"', "", body].join("\r\n"))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const r = await fetch(`${GW}/users/me/messages/send`, { method: "POST", headers: headers(), body: JSON.stringify({ raw }) });
  if (!r.ok) throw new Error(`Gmail send failed [${r.status}]: ${(await r.text()).slice(0, 200)}`);
  return to;
}

type StockRow = { symbol: string; name: string; currency: string; price: number | null; score: number | null; signal: string | null; mom_1m: number | null; mom_3m: number | null; rsi14: number | null; volatility: number | null; sma50: number | null; updated_at: string | null };
const COLS = "symbol,name,currency,price,score,signal,mom_1m,mom_3m,rsi14,volatility,sma50,updated_at";
const f = (x: number | null | undefined, d = 2) => (x == null ? "n/a" : Number(x).toFixed(d));

function facts(s: StockRow) {
  return [
    `Price: ${f(s.price)} ${s.currency} (data as of ${s.updated_at ? new Date(s.updated_at).toISOString() : "n/a"})`,
    `Quant score: ${s.score}/100 (${s.signal})`,
    `1-month: ${f(s.mom_1m, 1)}%  |  3-month: ${f(s.mom_3m, 1)}%`,
    `RSI(14): ${f(s.rsi14, 0)}  |  50-day avg: ${f(s.sma50)}  |  annualized volatility: ${f(s.volatility, 0)}%`,
  ].join("\n");
}
function risks(s: StockRow, action: string) {
  const r: string[] = [];
  if ((s.rsi14 ?? 50) > 70) r.push("RSI is elevated — pullback risk after a strong run.");
  if ((s.volatility ?? 0) > 45) r.push("High volatility — wide price swings are likely.");
  if (action === "BUY") r.push("Momentum signals can reverse quickly; no fundamental or news data is included in this model.");
  else r.push("Oversold stocks can rebound sharply; short-term bounces are common.");
  return r.map((x) => `- ${x}`).join("\n");
}
const footer = (code: string) => `\n\nOpportunity ID: ${code}\nSent: ${new Date().toISOString()}\nData source: ${SOURCE}\nSimulated trading only — no real money is used. Not financial advice.`;

/** Advances email sequences and detects new opportunities. Called from the scheduled job. */
export async function runOpportunityEmails() {
  const { data: cfg } = await supabaseAdmin.from("email_settings").select("*").eq("id", 1).maybeSingle();
  if (!cfg?.enabled) return { skipped: true };
  const now = Date.now();
  let sent = 0;

  // 1) Advance active sequences that are due.
  const { data: due } = await supabaseAdmin.from("opportunities").select("*").eq("status", "active").lte("next_at", new Date().toISOString());
  for (const o of due ?? []) {
    const { data: s } = await supabaseAdmin.from("stocks").select(COLS).eq("symbol", o.symbol).maybeSingle<StockRow>();
    if (!s?.price || !s.updated_at || now - new Date(s.updated_at).getTime() > 6 * 3600_000) continue; // wait for fresh data
    const move = ((Number(s.price) - Number(o.price_at_detect)) / Number(o.price_at_detect)) * 100;
    const still = o.action === "BUY" ? (s.score ?? 0) >= 68 : (s.score ?? 100) <= 38;
    try {
      if (o.stage === 1) {
        const body = `Update on ${s.name} (${s.symbol}) — proposed ${o.action}\n\nStatus: ${still ? "STILL VALID" : "WEAKENED"}\nScore at detection: ${o.score_at_detect} → now ${s.score}\nPrice move since detection: ${move >= 0 ? "+" : ""}${move.toFixed(2)}%\n\n${facts(s)}\n\nAssessment: ${still ? "The signal remains in place." : "The signal has faded below the action threshold."}${footer(o.code)}`;
        await sendEmail(`[2/3] Update: ${o.action} ${s.symbol} — ${still ? "still valid" : "weakened"}`, body);
        await supabaseAdmin.from("opportunities").update({ stage: 2, next_at: new Date(now + cfg.stage_gap_minutes * 60_000).toISOString(), log: [...(o.log as unknown[]), { stage: 2, at: new Date().toISOString(), score: s.score, price: s.price }] }).eq("id", o.id);
      } else {
        const { data: trades } = await supabaseAdmin.from("paper_trades").select("side,user_id").eq("symbol", o.symbol).eq("source", "bot").gte("created_at", o.created_at);
        const want = o.action === "BUY" ? "buy" : "sell";
        const n = (trades ?? []).filter((t) => t.side === want).length;
        const paper = n ? `Paper autopilot SUBMITTED ${n} simulated ${want} order(s).` : still ? "Paper autopilot SKIPPED (limits, market hours, or already positioned)." : "Paper autopilot SKIPPED — conditions no longer met.";
        const body = `Final status: ${s.name} (${s.symbol}) — proposed ${o.action}\n\nTrade conditions: ${still ? "SATISFIED" : "NOT SATISFIED"}\nScore: ${o.score_at_detect} → ${s.score} | price move ${move >= 0 ? "+" : ""}${move.toFixed(2)}%\n\n${paper}\nReal order: NOT SUBMITTED — no brokerage account is connected.\n\n${facts(s)}${footer(o.code)}`;
        await sendEmail(`[3/3] Final: ${o.action} ${s.symbol} — ${n ? "paper order submitted" : "skipped"}`, body);
        await supabaseAdmin.from("opportunities").update({ stage: 3, status: "done", next_at: null, log: [...(o.log as unknown[]), { stage: 3, at: new Date().toISOString(), score: s.score, price: s.price, paper }] }).eq("id", o.id);
      }
      sent++;
    } catch (e) {
      console.error("opportunity email", o.code, e);
      return { sent, error: e instanceof Error ? e.message : "send failed" };
    }
  }

  // 2) Detect new opportunities (respect daily cap + no duplicates for an unchanged signal).
  const dayAgo = new Date(now - 24 * 3600_000).toISOString();
  const { count: today } = await supabaseAdmin.from("opportunities").select("id", { count: "exact", head: true }).gte("created_at", dayAgo);
  let room = cfg.max_sequences_per_day - (today ?? 0);
  if (room <= 0) return { sent };
  const fresh = new Date(now - 3 * 3600_000).toISOString();
  const [{ data: buys }, { data: sells }] = await Promise.all([
    supabaseAdmin.from("stocks").select(COLS).gte("score", cfg.min_score).gte("market_cap", 2e9).gte("updated_at", fresh).order("score", { ascending: false }).limit(15),
    supabaseAdmin.from("stocks").select(COLS).lte("score", 100 - cfg.min_score).gte("market_cap", 2e9).gte("updated_at", fresh).order("score", { ascending: true }).limit(15),
  ]);
  const cands = [...(buys ?? []).map((s) => ({ s: s as StockRow, action: "BUY" })), ...(sells ?? []).map((s) => ({ s: s as StockRow, action: "SELL" }))];
  for (const { s, action } of cands) {
    if (room <= 0) break;
    const { data: prev } = await supabaseAdmin.from("opportunities").select("score_at_detect,created_at,status").eq("symbol", s.symbol).eq("action", action).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (prev) {
      const ageDays = (now - new Date(prev.created_at).getTime()) / 86400_000;
      const changed = Math.abs((s.score ?? 0) - prev.score_at_detect) >= 15;
      if (prev.status === "active" || (ageDays < 14 && !changed)) continue;
    }
    const code = `OPP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${s.symbol.replace(/[^A-Z0-9]/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const body = `Opportunity detected: ${s.name} (${s.symbol})\nProposed action: ${action}\n\nSupporting evidence:\n${facts(s)}\n- Price is ${Number(s.price) > Number(s.sma50 ?? 0) ? "above" : "below"} its 50-day average.\n\nMain risks:\n${risks(s, action)}\n\nYou'll get an update in about ${Math.round(cfg.stage_gap_minutes / 60)}h and a final status after that.${footer(code)}`;
    try {
      await sendEmail(`[1/3] Opportunity: ${action} ${s.symbol} (score ${s.score})`, body);
    } catch (e) {
      console.error("opportunity email", e);
      return { sent, error: e instanceof Error ? e.message : "send failed" };
    }
    await supabaseAdmin.from("opportunities").insert({ code, symbol: s.symbol, action, score_at_detect: s.score ?? 0, price_at_detect: s.price ?? 0, next_at: new Date(now + cfg.stage_gap_minutes * 60_000).toISOString(), log: [{ stage: 1, at: new Date().toISOString(), score: s.score, price: s.price }] });
    sent++; room--;
  }
  return { sent };
}
