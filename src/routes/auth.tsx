import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { passwordSignIn, reportOauthFailure } from "@/lib/security.functions";

const safePath = (p?: string) => (p && p.startsWith("/") && !p.startsWith("//") ? p : "/portfolio");

export const Route = createFileRoute("/auth")({
  staticData: { sitemap: false },
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Logga in — StockLab" },
      { name: "description", content: "Logga in på StockLab för din virtuella portfölj och AI-autopilot." },
      { property: "og:title", content: "Logga in — StockLab" },
      { property: "og:description", content: "Logga in på StockLab för din virtuella portfölj och AI-autopilot." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) nav({ to: safePath(redirect) }); });
    // Full-page OAuth redirects come back with ?error=… when the provider sign-in failed.
    const q = new URLSearchParams(window.location.search);
    if (q.get("error")) {
      reportOauthFailure({ data: { provider: "google" } }).catch(() => {});
      toast.error("Inloggning med Google misslyckades. Försök igen.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [nav, redirect]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const r = await passwordSignIn({ data: { email, password } });
        if (r.error || !r.session) throw new Error(r.error ?? "Inloggningen misslyckades");
        const { error } = await supabase.auth.setSession(r.session);
        if (error) throw error;
        nav({ to: safePath(redirect) });
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}${safePath(redirect)}` } });
        if (error) throw error;
        if (data.session) nav({ to: safePath(redirect) });
        else toast.success("Kolla din e-post för att bekräfta kontot.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Inloggningen misslyckades");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    sessionStorage.setItem("post-auth", safePath(redirect));
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) {
      reportOauthFailure({ data: { provider: "google" } }).catch(() => {});
      toast.error("Inloggning med Google misslyckades");
      return;
    }
    if (r.redirected) return;
    nav({ to: safePath(redirect) });
  }

  return (
    <div className="mx-auto mt-10 max-w-sm rounded-lg border border-border bg-card p-6">
      <h1 className="text-xl font-bold">{mode === "in" ? "Logga in" : "Skapa konto"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Få en virtuell portfölj och en AI-autopilot.</p>
      <button onClick={google} className="mt-5 w-full rounded-md border border-border py-2 text-sm hover:bg-accent">Fortsätt med Google</button>
      <div className="my-4 text-center font-mono text-[10px] uppercase text-muted-foreground">or</div>
      <form onSubmit={submit} className="grid gap-3">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-post" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Lösenord" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <button disabled={busy} className="rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? "…" : mode === "in" ? "Logga in" : "Registrera"}</button>
      </form>
      <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground">
        {mode === "in" ? "Inget konto? Registrera dig" : "Har du konto? Logga in"}
      </button>
      {mode === "in" && (
        <button
          onClick={async () => {
            if (!email) { toast.error("Skriv in din e-post först."); return; }
            const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
            if (error) toast.error("Kunde inte skicka återställningslänken.");
            else toast.success("Om kontot finns har vi skickat en återställningslänk.");
          }}
          className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          Glömt lösenordet?
        </button>
      )}
    </div>
  );
}
