import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getPortfolio from "./tools/get-portfolio";
import listTrades from "./tools/list-trades";
import topStocks from "./tools/top-stocks";
import stockAnalysis from "./tools/stock-analysis";
import listsAndAlerts from "./tools/lists-and-alerts";

// Vite inlines the stable ref; the published SUPABASE_URL may be a proxy.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "market-whisperer-ai",
  title: "Market Whisperer AI",
  version: "0.1.0",
  instructions:
    "Read-only tools for StockLab, an educational stock-market simulator. All portfolios and trades are simulated paper trading with virtual money — never describe them as real. Use these tools to view the signed-in user's paper portfolio, recent trades, watchlists and price alerts, the scanner's top quant-scored stocks, and detailed metrics plus the latest AI report for a single stock.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getPortfolio, listTrades, topStocks, stockAnalysis, listsAndAlerts],
});
