import { createFileRoute } from "@tanstack/react-router";
import { StockDetail } from "@/components/StockDetail";

export const Route = createFileRoute("/stock/$symbol")({
  staticData: { sitemap: false },
  head: ({ params }) => ({
    meta: [
      { title: `${params.symbol.toUpperCase()} — AI analysis | StockLab` },
      { name: "description", content: `Live price, quant score, technicals and AI outlook for ${params.symbol.toUpperCase()}.` },
      { property: "og:title", content: `${params.symbol.toUpperCase()} — AI analysis | StockLab` },
      { property: "og:description", content: `Live price, quant score, technicals and AI outlook for ${params.symbol.toUpperCase()}.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => {
    const { symbol } = Route.useParams();
    const s = symbol.toUpperCase();
    return <StockDetail key={s} symbol={s} />;
  },
});
