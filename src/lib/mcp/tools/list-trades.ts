import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_trades",
  title: "List paper trades",
  description: "List the signed-in user's most recent simulated (paper) trades, newest first.",
  inputSchema: { limit: z.number().int().min(1).max(100).default(20).describe("How many trades to return (1-100).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const { data, error } = await supabaseForUser(ctx)
      .from("paper_trades")
      .select("id, symbol, side, qty, price, realized_pnl, source, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new ToolError(error.message);
    const trades = (data ?? []).map((t) => ({
      id: t.id, symbol: t.symbol, side: t.side, qty: Number(t.qty), priceUsd: Number(t.price),
      realizedPnlUsd: t.realized_pnl == null ? null : Number(t.realized_pnl), source: t.source, createdAt: t.created_at,
    }));
    return { content: [{ type: "text", text: JSON.stringify(trades) }], structuredContent: { simulated: true, trades } };
  },
});
