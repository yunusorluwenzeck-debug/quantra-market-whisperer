import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/screener", label: "Screener" },
  { to: "/backtest", label: "Backtest" },
  { to: "/portfolio", label: "Paper Portfolio" },
  { to: "/autopilot", label: "Autopilot" },
  { to: "/lists", label: "Lists" },
  { to: "/alerts", label: "Alerts" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const { data: alertCount } = useQuery({
    queryKey: ["alerts-unseen", user?.id],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count } = await supabase.from("price_alerts").select("id", { count: "exact", head: true }).not("triggered_at", "is", null).eq("seen", false);
      return count ?? 0;
    },
  });
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
            <span className="text-lg font-bold tracking-tight">QUANTRA</span>
          </Link>
          <nav className="flex flex-wrap gap-1 font-mono text-xs">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }}
                className="rounded px-2.5 py-1.5 text-muted-foreground hover:text-foreground"
                activeProps={{ className: "rounded px-2.5 py-1.5 bg-accent text-foreground" }}>
                {n.label}
                {n.to === "/alerts" && !!alertCount && <span className="ml-1 rounded bg-primary px-1 text-primary-foreground">{alertCount}</span>}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <form onSubmit={(e) => { e.preventDefault(); const s = q.trim().toUpperCase(); if (s) nav({ to: "/stock/$symbol", params: { symbol: s } }); setQ(""); }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ticker… e.g. VOLV-B.ST"
                className="w-44 rounded-md border border-input bg-card px-3 py-1.5 font-mono text-xs uppercase outline-none placeholder:normal-case placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" />
            </form>
            {user ? (
              <button onClick={() => supabase.auth.signOut()} className="font-mono text-xs text-muted-foreground hover:text-foreground">Sign out</button>
            ) : (
              <Link to="/auth" className="rounded-md bg-primary px-3 py-1.5 font-mono text-xs font-semibold text-primary-foreground">Sign in</Link>
            )}
          </div>
        </div>
        <div className="border-t border-border bg-card/50 py-1 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Simulated trading only — virtual money, no real orders are placed
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
    </div>
  );
}

export function Card({ title, right, children, className = "" }: { title?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-border bg-card ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{title}</div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}
