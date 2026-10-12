import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "top_stocks",
  title: "Top scored stocks",
  description: "Return the highest quant-scored stocks from the scanner, optionally filtered by region (e.g. US, Europe).",
  inputSchema: {
    region: z.string().trim().optional().describe("Optional region filter, e.g. 'US' or 'Europe'."),
    limit: z.number().int().min(1).max(50).default(10).describe("How many stocks to return (1-50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ region, limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    let q = supabaseForUser(ctx)
      .from("stocks")
      .select("symbol, name, region, sector, currency, price, change_pct, score, signal, rsi14, updated_at")
      .not("score", "is", null)
      .order("score", { ascending: false })
      .limit(limit);
    if (region) q = q.ilike("region", region);
    const { data, error } = await q;
    if (error) throw new ToolError(error.message);
    const stocks = (data ?? []).map((s) => ({
      symbol: s.symbol, name: s.name, region: s.region, sector: s.sector, currency: s.currency,
      price: s.price, changePct: s.change_pct, score: s.score, signal: s.signal, rsi14: s.rsi14, updatedAt: s.updated_at,
    }));
    return { content: [{ type: "text", text: JSON.stringify(stocks) }], structuredContent: { stocks } };
  },
});
