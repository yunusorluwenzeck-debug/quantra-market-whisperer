import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_portfolio",
  title: "Get paper portfolio",
  description: "Return the signed-in user's simulated (paper) account cash and open positions in USD.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Not authenticated");
    const sb = supabaseForUser(ctx);
    const [acc, pos] = await Promise.all([
      sb.from("paper_accounts").select("cash, starting_cash").maybeSingle(),
      sb.from("paper_positions").select("symbol, qty, avg_cost, opened_at"),
    ]);
    if (acc.error || pos.error) throw new ToolError((acc.error ?? pos.error)!.message);
    const positions = (pos.data ?? []).map((p) => ({ symbol: p.symbol, qty: Number(p.qty), avgCostUsd: Number(p.avg_cost), openedAt: p.opened_at }));
    const result = {
      simulated: true,
      cashUsd: acc.data ? Number(acc.data.cash) : null,
      startingCashUsd: acc.data ? Number(acc.data.starting_cash) : null,
      positions,
    };
    return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result };
  },
});
