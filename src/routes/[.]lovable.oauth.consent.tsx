import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type OAuthResult = { data: { redirect_url?: string; redirect_to?: string; client?: { name?: string } } | null; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  staticData: { sitemap: false },
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Godkänn anslutning — StockLab" },
      { name: "description", content: "Godkänn att en AI-assistent ansluter till ditt StockLab-konto." },
      { property: "og:title", content: "Godkänn anslutning — StockLab" },
      { property: "og:description", content: "Godkänn att en AI-assistent ansluter till ditt StockLab-konto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Saknar authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/auth", search: { redirect: next } });
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(id);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md p-8 text-center">
      <h1 className="text-xl font-semibold">Kunde inte läsa in förfrågan</h1>
      <p className="mt-2 text-muted-foreground">{error instanceof Error ? error.message : String(error)}</p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = details?.client?.name ?? "en app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    try {
      const { data, error } = approve
        ? await oauth().approveAuthorization(authorization_id)
        : await oauth().denyAuthorization(authorization_id);
      if (error) throw new Error(error.message);
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) throw new Error("Ingen omdirigering mottogs.");
      window.location.href = target;
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Anslut {name} till ditt konto</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {name} får läsa din virtuella portfölj, dina simulerade affärer och toppaktierna från skannern. Den kan inte handla åt dig.
        </p>
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        <div className="mt-6 flex gap-3">
          <Button disabled={busy} onClick={() => decide(true)}>Godkänn</Button>
          <Button variant="outline" disabled={busy} onClick={() => decide(false)}>Neka</Button>
        </div>
      </div>
    </main>
  );
}
