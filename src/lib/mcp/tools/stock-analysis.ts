import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_stock_analysis",
  title: "Get stock analysis",
  description: "Return key metrics (price, momentum, RSI, moving averages, volatility, quant score, signal) and the latest AI report for one stock symbol.",
  inputSchema: { symbol: z.string().trim().min(1).max(15).describe("Ticker symbol, e.g. AAPL or VOLV-B.ST.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ symbol }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const sb = supabaseForUser(ctx);
    const sym = symbol.toUpperCase();
    const [st, rep] = await Promise.all([
      sb.from("stocks").select("symbol,name,country,region,sector,currency,market_cap,price,price_usd,change_pct,mom_1m,mom_3m,rsi14,volatility,sma20,sma50,score,signal,updated_at").eq("symbol", sym).maybeSingle(),
      sb.from("ai_reports").select("signal,score,content,created_at").eq("symbol", sym).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (st.error) throw new ToolError(st.error.message);
    if (!st.data) throw new ToolError(`Stock ${sym} is not in the StockLab universe.`);
    const s = st.data;
    const result = {
      symbol: s.symbol, name: s.name, country: s.country, region: s.region, sector: s.sector, currency: s.currency,
      metrics: {
        price: s.price, priceUsd: s.price_usd, changePct: s.change_pct, marketCap: s.market_cap,
        momentum1mPct: s.mom_1m, momentum3mPct: s.mom_3m, rsi14: s.rsi14, volatility: s.volatility,
        sma20: s.sma20, sma50: s.sma50, quantScore: s.score, signal: s.signal, updatedAt: s.updated_at,
      },
      aiReport: rep.data ? { signal: rep.data.signal, score: rep.data.score, content: rep.data.content, createdAt: rep.data.created_at } : null,
      note: "Educational analysis only; StockLab uses virtual money.",
    };
    return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
  },
});
