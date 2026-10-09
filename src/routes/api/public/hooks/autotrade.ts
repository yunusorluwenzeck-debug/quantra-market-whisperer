import { createFileRoute } from "@tanstack/react-router";
import { runAllBots } from "@/lib/bot.server";
import { generateTopPickReports } from "@/lib/ai.server";
import { claimJob, hasBearer } from "@/lib/jobs.server";

export const Route = createFileRoute("/api/public/hooks/autotrade")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!hasBearer(request)) return new Response("Unauthorized", { status: 401 });
        if (!(await claimJob("autotrade", 25 * 60_000))) return Response.json({ skipped: true });
        const bots = await runAllBots().catch((e) => { console.error(e); return null; });
        let reports = 0;
        const key = process.env["LOVABLE_API_KEY"];
        if (key && (await claimJob("ai-reports", 6 * 3600_000))) {
          reports = await generateTopPickReports(key).catch((e) => { console.error(e); return 0; });
        }
        return Response.json({ bots, reports });
      },
    },
  },
});
