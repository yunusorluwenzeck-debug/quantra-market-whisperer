import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isOwner, NOT_OWNER } from "./owner";
import { logEvent } from "./security.server";

const USER_TABLES = ["paper_accounts", "paper_positions", "paper_trades", "bot_settings", "bot_events", "stock_lists", "price_alerts", "security_events"] as const;
const PRIVATE_TABLES = [...USER_TABLES, "email_settings", "opportunities", "user_roles", "job_runs", "order_keys", "stocks", "ai_reports"];

type Check = { id: string; label: string; status: "pass" | "fail" | "warn" | "info"; detail: string; critical?: boolean };

export const recordSignIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await logEvent(context.userId, "sign_in");
    return { ok: true };
  });

export const getSecurityStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isOwner(context.supabase as never, context.userId))) {
      await logEvent(context.userId, "owner_check_denied", { action: "view_security_status" });
      return { owner: false as const, error: NOT_OWNER };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const checks: Check[] = [];
    const ranAt = new Date().toISOString();

    // 1. Row-level security on every table
    const { data: tables, error: tErr } = await supabaseAdmin.rpc("security_table_report");
    if (tErr || !tables) checks.push({ id: "rls", label: "Row-level security on every table", status: "fail", detail: "Could not read table settings", critical: true });
    else {
      const off = tables.filter((t) => !t.rls_enabled).map((t) => t.table_name);
      checks.push({ id: "rls", label: "Row-level security on every table", status: off.length ? "fail" : "pass", critical: true,
        detail: off.length ? `Missing on: ${off.join(", ")}` : `Enabled on all ${tables.length} tables` });
    }

    // 2. Signed-out read probe against every private table
    const url = process.env["SUPABASE_URL"]!;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!;
    const leaks: string[] = [];
    await Promise.all(PRIVATE_TABLES.map(async (t) => {
      const r = await fetch(`${url}/rest/v1/${t}?select=*&limit=1`, { headers: { apikey: key } });
      const b = await r.json().catch(() => null);
      if (Array.isArray(b) && b.length > 0) leaks.push(t);
    }));
    checks.push({ id: "anon", label: "Signed-out visitors cannot read private data", status: leaks.length ? "fail" : "pass", critical: true,
      detail: leaks.length ? `Readable without sign-in: ${leaks.join(", ")}` : `Probed ${PRIVATE_TABLES.length} tables live — 0 rows returned` });

    // 3. Gmail connection
    try {
      const { gmailAddress } = await import("./notify.server");
      const addr = await gmailAddress();
      checks.push({ id: "gmail", label: "Gmail connection", status: "pass", detail: `Connected as ${addr} (send-only use; tokens held by the managed connector, not this app's database)` });
    } catch {
      checks.push({ id: "gmail", label: "Gmail connection", status: "warn", detail: "Not reachable — email alerts will not send" });
    }

    // 4. Background jobs
    const { data: jobs } = await supabaseAdmin.from("job_runs").select("job,last_run");
    const stale = (jobs ?? []).filter((j) => Date.now() - new Date(j.last_run).getTime() > 2 * 3600_000).map((j) => j.job);
    checks.push({ id: "jobs", label: "Background jobs running", status: stale.length ? "warn" : "pass",
      detail: stale.length ? `No run in 2h: ${stale.join(", ")}` : (jobs ?? []).map((j) => `${j.job}: ${new Date(j.last_run).toLocaleString("en-GB")}`).join(" · ") || "No runs recorded" });

    // 5. Suspicious activity in the last 7 days
    const since = new Date(Date.now() - 7 * 86400_000).toISOString();
    const { count: denied } = await supabaseAdmin.from("security_events").select("id", { count: "exact", head: true }).eq("kind", "owner_check_denied").gte("created_at", since);
    const { count: dupes } = await supabaseAdmin.from("security_events").select("id", { count: "exact", head: true }).eq("kind", "duplicate_order_blocked").gte("created_at", since);
    checks.push({ id: "activity", label: "Blocked access attempts (7 days)", status: (denied ?? 0) > 0 ? "warn" : "pass",
      detail: `${denied ?? 0} owner-only requests refused · ${dupes ?? 0} duplicate orders blocked` });

    // 6. Things the app cannot verify itself — reported honestly
    checks.push({ id: "backups", label: "Database backups", status: "info", detail: "Automatic, encrypted backups are managed by Lovable Cloud. Restore drills cannot be run or verified from inside the app." });
    checks.push({ id: "secrets", label: "Secret keys kept off the browser", status: "info", detail: "Enforced by code structure (server-only modules). Not re-scanned on this page." });
    checks.push({ id: "ratelimit", label: "Request rate limiting", status: "warn", detail: "Only background jobs are rate-limited. There is no per-user request throttling." });

    const criticalFail = checks.some((c) => c.critical && c.status === "fail");
    const { data: events } = await supabaseAdmin.from("security_events").select("kind,detail,created_at,user_id").order("created_at", { ascending: false }).limit(30);
    return {
      owner: true as const, ranAt, checks, events: events ?? [],
      liveTrading: { allowed: false, reason: criticalFail ? "Blocked: critical security checks are failing" : "Not available: real-money trading is not implemented" },
      providers: [
        { name: "Yahoo Finance", gets: "Ticker symbols only (to fetch public prices)" },
        { name: "Lovable AI", gets: "Public market data for top-scored stocks — never balances, holdings or account details" },
        { name: "Gmail (your account)", gets: "Opportunity alert emails sent to you — never passwords, keys or balances" },
      ],
    };
  });

export const exportMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const out: Record<string, unknown> = { exported_at: new Date().toISOString(), user_id: context.userId };
    for (const t of USER_TABLES) {
      const { data } = await context.supabase.from(t).select("*").limit(10000);
      out[t] = data ?? [];
    }
    await logEvent(context.userId, "data_exported");
    return JSON.stringify(out, null, 2);
  });

export const deleteMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ confirm: z.literal("DELETE") }).parse(d))
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const u = context.userId;
    for (const t of [...USER_TABLES.filter((t) => t !== "security_events"), "order_keys"] as const) {
      const { error } = await supabaseAdmin.from(t).delete().eq("user_id", u);
      if (error) return { ok: false, error: "Deletion did not complete — please try again" };
    }
    await logEvent(u, "data_deleted");
    return { ok: true, error: null };
  });
