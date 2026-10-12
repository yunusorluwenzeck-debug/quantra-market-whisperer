import { createFileRoute } from "@tanstack/react-router";
import { isCronCaller } from "@/lib/jobs.server";

export const Route = createFileRoute("/api/public/hooks/mission-push")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await isCronCaller(request))) return new Response("Unauthorized", { status: 401 });
        const { periodKeys } = await import("@/lib/progress.server");
        // Runs at 22:01 and 23:01 UTC; only act once it is past midnight in Stockholm.
        const hour = Number(new Date().toLocaleString("en-US", { timeZone: "Europe/Stockholm", hour: "2-digit", hourCycle: "h23" }));
        if (hour > 2) return Response.json({ skipped: true, day: periodKeys().day });
        const { pushNewMissions } = await import("@/lib/push.server");
        const sent = await pushNewMissions().catch((e) => { console.error(e); return 0; });
        return Response.json({ sent });
      },
    },
  },
});
