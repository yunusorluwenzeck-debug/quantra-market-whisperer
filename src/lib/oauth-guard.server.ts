// Suspicious-activity monitoring for federated sign-in (Google via the Lovable broker).
// Failed OAuth attempts never reach Supabase Auth as password failures, so the app
// records them itself: each failure is logged, and repeated failures within a short
// window raise a security event (shown on the security page; no emails, since reports are unauthenticated). No tokens or emails are stored.
import { logEvent } from "./security.server";

export const OAUTH_MAX_FAILS = 5;
export const OAUTH_WINDOW_MIN = 15;

type Deps = {
  countRecent: (provider: string, sinceIso: string) => Promise<number>;
  log: (kind: string, detail: Record<string, unknown>) => Promise<void>;
  now: () => number;
};

async function defaultDeps(): Promise<Deps> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return {
    now: () => Date.now(),
    log: (kind, detail) => logEvent(null, kind, detail),
    countRecent: async (provider, sinceIso) => {
      const { count } = await supabaseAdmin.from("security_events").select("id", { count: "exact", head: true })
        .eq("kind", "oauth_sign_in_failed").eq("detail->>provider", provider).gte("created_at", sinceIso);
      return count ?? 0;
    },
  };
}

/** Records a failed OAuth sign-in attempt; flags repeated attempts on the security page. */
export async function recordOauthFailure(
  provider: string,
  country: string | null,
  deps?: Deps,
): Promise<{ suspicious: boolean; count: number }> {
  const d = deps ?? (await defaultDeps());
  await d.log("oauth_sign_in_failed", { provider, country });
  const since = new Date(d.now() - OAUTH_WINDOW_MIN * 60_000).toISOString();
  const count = await d.countRecent(provider, since);
  if (count >= OAUTH_MAX_FAILS) {
    await d.log("oauth_sign_in_suspicious", { provider, count, window_min: OAUTH_WINDOW_MIN, country });
    return { suspicious: true, count };
  }
  return { suspicious: false, count };
}
