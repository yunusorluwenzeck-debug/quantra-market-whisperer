import { createFileRoute } from "@tanstack/react-router";
import { checkAlerts, runScan } from "@/lib/scanner.server";
import { claimJob, hasBearer } from "@/lib/jobs.server";

export const Route = createFileRoute("/api/public/hooks/scan")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!hasBearer(request)) return new Response("Unauthorized", { status: 401 });
        if (!(await claimJob("scan-lock", 4 * 60_000))) return Response.json({ skipped: true });
        try {
          const r = await runScan();
          const alerts = await checkAlerts();
          return Response.json({ ...r, alerts });
        } catch (e) {
          console.error("scan", e);
          return Response.json({ error: "scan failed" }, { status: 500 });
        }
      },
    },
  },
});
