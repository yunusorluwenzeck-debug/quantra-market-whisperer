import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { getSekRate } from "@/lib/market.functions";
import { setSekRate } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SaveBadge } from "@/components/SaveBadge";
import { MfaGate } from "@/components/Mfa";

const NAV = [
  { to: "/", label: "Översikt" },
  { to: "/screener", label: "Aktier" },
  { to: "/fonder", label: "Fonder" },
  { to: "/backtest", label: "Historiktest" },
  { to: "/portfolio", label: "Portfölj" },
  { to: "/autopilot", label: "Autopilot" },
  { to: "/lists", label: "Listor" },
  { to: "/progress", label: "Framsteg" },
  { to: "/alerts", label: "Larm" },
  { to: "/security", label: "Säkerhet" },
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
  const { data: fx } = useQuery({ queryKey: ["sek-rate"], queryFn: () => getSekRate(), staleTime: 3_600_000 });
  const sek = fx?.sekPerUsd ?? null;
  setSekRate(sek);
  const [dark, setDark] = useState(true);
  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, []);
  const toggleTheme = () => {
    const next = !dark; setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch { /* ignore */ }
  };
  return (
    <div className="min-h-screen">
      <MfaGate />
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-xs font-extrabold text-primary-foreground">SL</span>
            <span className="text-lg font-bold tracking-tight">StockLab</span>
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
            {user && <SaveBadge />}
            <button onClick={toggleTheme} aria-label="Byt ljust/mörkt läge" className="rounded-full border border-border px-2.5 py-1 font-mono text-xs text-muted-foreground hover:text-foreground">{dark ? "Ljust" : "Mörkt"}</button>
            <form onSubmit={(e) => { e.preventDefault(); const s = q.trim().toUpperCase(); if (s) nav({ to: "/stock/$symbol", params: { symbol: s } }); setQ(""); }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sök ticker… t.ex. VOLV-B.ST"
                className="w-44 rounded-md border border-input bg-card px-3 py-1.5 font-mono text-xs uppercase outline-none placeholder:normal-case placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" />
            </form>
            {user ? (
              <button onClick={() => supabase.auth.signOut()} className="font-mono text-xs text-muted-foreground hover:text-foreground">Logga ut</button>
            ) : (
              <Link to="/auth" className="rounded-md bg-primary px-3 py-1.5 font-mono text-xs font-semibold text-primary-foreground">Logga in</Link>
            )}
          </div>
        </div>
        <div className="border-t border-border bg-card/50 py-1 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Endast simulering — virtuella pengar, inga riktiga affärer görs
        </div>
      </header>
      <main key={sek ? "sek" : "usd"} className="mx-auto max-w-7xl px-4 py-6 animate-in fade-in duration-300 sm:px-6">{children}</main>
    </div>
  );
}

export function Card({ title, right, children, className = "" }: { title?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md ${className}`}>
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
