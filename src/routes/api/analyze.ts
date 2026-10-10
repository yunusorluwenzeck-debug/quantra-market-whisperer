import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { fetchStock } from "@/lib/market.server";

const RUN = "X-Lovable-AIG-Run-ID";

export const Route = createFileRoute("/api/analyze")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return Response.json({ error: "AI is not configured" }, { status: 500 });
        let symbol = "";
        try {
          symbol = String(((await request.json()) as { symbol?: string }).symbol ?? "");
        } catch {}
        let s;
        try {
          s = await fetchStock(symbol);
        } catch (e) {
          return Response.json({ error: e instanceof Error ? e.message : "Bad ticker" }, { status: 400 });
        }
        const recent = s.candles.slice(-30).map((c) => `${new Date(c.t).toISOString().slice(0, 10)} ${c.c.toFixed(2)}`).join("\n");
        const f = (x: number | null, d = 2) => (x == null ? "n/a" : x.toFixed(d));
        const ctx = `Ticker: ${s.symbol} (${s.name}), ${s.exchange}, ${s.currency}
Price ${f(s.price)} | day ${f(s.changePct)}% | 1M momentum ${f(s.indicators.momentum1m)}%
SMA20 ${f(s.indicators.sma20)} | SMA50 ${f(s.indicators.sma50)} | RSI14 ${f(s.indicators.rsi14, 1)}
Annualized vol ${f(s.indicators.volatility, 1)}% | 52w range ${f(s.indicators.low52)}–${f(s.indicators.high52)}
Last 30 closes:
${recent}`;

        let runId: string | undefined;
        const provider = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: async (input, init) => {
            const h = new Headers(init?.headers);
            if (runId) h.set(RUN, runId);
            const r = await fetch(input, { ...init, headers: h });
            runId ??= r.headers.get(RUN) ?? undefined;
            if (!r.ok) {
              const body = await r.clone().text();
              console.error("AI gateway", r.status, body.slice(0, 300));
            }
            return r;
          },
        });

        const result = streamText({
          model: provider.responses("openai/gpt-6-astra"),
          instructions: `You are a quantitative equity analyst. Using ONLY the data given, write a concise markdown report with these sections:
## Signal
One line: **BULLISH**, **BEARISH**, or **NEUTRAL** with confidence (Low/Medium/High).
## Price outlook
Expected direction and a plausible price range for the next 1–2 weeks and 1–3 months, with reasoning.
## Technicals
Trend (SMA crossovers), momentum (RSI), volatility.
## Key levels
Support and resistance.
## Risks
2–3 bullets.
Keep it under 300 words. End with one italic line: not financial advice.`,
          messages: [{ role: "user", content: ctx }],
          abortSignal: request.signal,
          maxRetries: 0,
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "low",
              reasoningSummary: "auto",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
          onError: ({ error }) => console.error("analyze stream error", error),
        });
        return result.toTextStreamResponse({ headers: { "Cache-Control": "no-cache, no-transform" } });
      },
    },
  },
});
