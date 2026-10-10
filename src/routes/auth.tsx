import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

const safePath = (p?: string) => (p && p.startsWith("/") && !p.startsWith("//") ? p : "/portfolio");

export const Route = createFileRoute("/auth")({
  staticData: { sitemap: false },
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — Quantra" },
      { name: "description", content: "Sign in to Quantra to run your paper portfolio and AI autopilot." },
      { property: "og:title", content: "Sign in — Quantra" },
      { property: "og:description", content: "Sign in to Quantra to run your paper portfolio and AI autopilot." },
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
  }, [nav, redirect]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const lock = await checkSignInLock({ data: { email } }).catch(() => ({ lockedUntil: null }));
        if (lock.lockedUntil) throw new Error(`Too many failed attempts. This account is temporarily locked until ${new Date(lock.lockedUntil).toLocaleTimeString()}.`);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (/invalid login/i.test(error.message)) {
            const r = await reportFailedSignIn({ data: { email } }).catch(() => ({ locked: false }));
            if (r.locked) throw new Error("Too many failed attempts. This account is temporarily locked for 30 minutes.");
          }
          throw error;
        }
        nav({ to: safePath(redirect) });
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}${safePath(redirect)}` } });
        if (error) throw error;
        if (data.session) nav({ to: safePath(redirect) });
        else toast.success("Check your email to confirm your account.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    sessionStorage.setItem("post-auth", safePath(redirect));
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) { toast.error("Google sign-in failed"); return; }
    if (r.redirected) return;
    nav({ to: safePath(redirect) });
  }

  return (
    <div className="mx-auto mt-10 max-w-sm rounded-lg border border-border bg-card p-6">
      <h1 className="text-xl font-bold">{mode === "in" ? "Sign in" : "Create account"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Get a $100,000 virtual portfolio and an AI autopilot.</p>
      <button onClick={google} className="mt-5 w-full rounded-md border border-border py-2 text-sm hover:bg-accent">Continue with Google</button>
      <div className="my-4 text-center font-mono text-[10px] uppercase text-muted-foreground">or</div>
      <form onSubmit={submit} className="grid gap-3">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <button disabled={busy} className="rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? "…" : mode === "in" ? "Sign in" : "Sign up"}</button>
      </form>
      <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground">
        {mode === "in" ? "No account? Sign up" : "Have an account? Sign in"}
      </button>
    </div>
  );
}
