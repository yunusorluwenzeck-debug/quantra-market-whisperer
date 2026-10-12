import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_watchlists_and_alerts",
  title: "Get watchlists and price alerts",
  description: "Return the signed-in user's saved stock watchlists and price alerts (read-only).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const sb = supabaseForUser(ctx);
    const [lists, alerts] = await Promise.all([
      sb.from("stock_lists").select("id,name,symbols,created_at").order("created_at", { ascending: false }),
      sb.from("price_alerts").select("id,symbol,direction,target,triggered_at,triggered_price,created_at").order("created_at", { ascending: false }).limit(200),
    ]);
    if (lists.error || alerts.error) throw new ToolError((lists.error ?? alerts.error)!.message);
    const result = {
      watchlists: (lists.data ?? []).map((l) => ({ id: l.id, name: l.name, symbols: l.symbols, createdAt: l.created_at })),
      priceAlerts: (alerts.data ?? []).map((a) => ({
        id: a.id, symbol: a.symbol, direction: a.direction, target: Number(a.target),
        triggered: a.triggered_at != null, triggeredAt: a.triggered_at, triggeredPrice: a.triggered_price == null ? null : Number(a.triggered_price), createdAt: a.created_at,
      })),
    };
    return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
  },
});
