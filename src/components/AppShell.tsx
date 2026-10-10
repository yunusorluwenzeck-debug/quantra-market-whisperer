import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { getSekRate } from "@/lib/market.functions";
import { setSekRate } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Home, LineChart, PieChart, Wallet, GraduationCap, Target, Trophy, Bot, History, ListChecks, Bell, Shield, Menu, X } from "lucide-react";
import { SaveBadge } from "@/components/SaveBadge";
import { MfaGate } from "@/components/Mfa";
import { MissionNotifier, useClaimableMissions } from "@/components/MissionNotifier";

const NAV = [
  { to: "/", label: "Hem", icon: Home },
  { to: "/screener", label: "Marknaden", icon: LineChart },
  { to: "/fonder", label: "Fonder", icon: PieChart },
  { to: "/portfolio", label: "Portfölj", icon: Wallet },
  { to: "/career", label: "Karriär", icon: GraduationCap },
  { to: "/progress", label: "Uppdrag", icon: Target },
  { to: "/leagues", label: "Ligor", icon: Trophy },
  { to: "/autopilot", label: "Autopilot", icon: Bot },
  { to: "/backtest", label: "Historiktest", icon: History },
  { to: "/lists", label: "Listor", icon: ListChecks },
  { to: "/alerts", label: "Larm", icon: Bell },
  { to: "/security", label: "Profil & säkerhet", icon: Shield },
] as const;
const MOBILE = NAV.slice(0, 4);

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
  const [more, setMore] = useState(false);
  const claimable = useClaimableMissions();
  const navLink = (n: (typeof NAV)[number], onClick?: () => void) => (
    <Link key={n.to} to={n.to} onClick={onClick} activeOptions={{ exact: n.to === "/" }}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      activeProps={{ className: "flex items-center gap-3 rounded-lg px-3 py-2 text-sm bg-primary/15 font-semibold text-primary" }}>
      <n.icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{n.label}</span>
      {n.to === "/alerts" && !!alertCount && <span className="rounded bg-primary px-1.5 font-mono text-[10px] text-primary-foreground">{alertCount}</span>}
      {n.to === "/progress" && !!claimable && <span className="rounded bg-primary px-1.5 font-mono text-[10px] text-primary-foreground">{claimable}</span>}
    </Link>
  );
  return (
    <div className="min-h-screen lg:pl-60">
      <MfaGate />
      <MissionNotifier />
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-secondary lg:flex">
        <Link to="/" className="flex items-center gap-2 px-5 py-5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-xs font-extrabold text-primary-foreground">SL</span>
          <span className="text-lg font-bold tracking-tight">StockLab</span>
        </Link>
        <nav className="grid gap-0.5 overflow-y-auto px-3 pb-4">{NAV.map((n) => navLink(n))}</nav>
        <div className="mt-auto border-t border-border p-4 font-mono text-[10px] uppercase leading-relaxed tracking-widest text-muted-foreground">Endast simulering — virtuella pengar</div>
      </aside>
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2 lg:hidden">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-xs font-extrabold text-primary-foreground">SL</span>
            <span className="hidden text-lg font-bold tracking-tight sm:inline">StockLab</span>
          </Link>
          <form className="min-w-0 flex-1 sm:max-w-xs" onSubmit={(e) => { e.preventDefault(); const s = q.trim().toUpperCase(); if (s) nav({ to: "/stock/$symbol", params: { symbol: s } }); setQ(""); }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sök ticker… t.ex. VOLV-B.ST"
              className="w-full rounded-md border border-input bg-card px-3 py-1.5 font-mono text-xs uppercase outline-none placeholder:normal-case placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" />
          </form>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            {user && <span className="hidden sm:inline"><SaveBadge /></span>}
            <button onClick={toggleTheme} aria-label="Byt ljust/mörkt läge" className="rounded-full border border-border px-2.5 py-1 font-mono text-xs text-muted-foreground hover:text-foreground">{dark ? "Ljust" : "Mörkt"}</button>
            {user ? (
              <button onClick={() => supabase.auth.signOut()} className="hidden font-mono text-xs text-muted-foreground hover:text-foreground sm:inline">Logga ut</button>
            ) : (
              <Link to="/auth" className="rounded-md bg-primary px-3 py-1.5 font-mono text-xs font-semibold text-primary-foreground">Logga in</Link>
            )}
          </div>
        </div>
        <div className="border-t border-border bg-card/50 py-1 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground lg:hidden">
          Endast simulering — virtuella pengar
        </div>
      </header>
      <main key={sek ? "sek" : "usd"} className="mx-auto max-w-7xl px-4 py-6 pb-24 animate-in fade-in duration-300 sm:px-6 lg:pb-6">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-secondary/95 backdrop-blur lg:hidden">
        {MOBILE.map((n) => (
          <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }} className="flex flex-col items-center gap-0.5 py-2 text-[10px] text-muted-foreground"
            activeProps={{ className: "flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold text-primary" }}>
            <n.icon className="h-5 w-5" />{n.label}
          </Link>
        ))}
        <button onClick={() => setMore(true)} className="flex flex-col items-center gap-0.5 py-2 text-[10px] text-muted-foreground"><Menu className="h-5 w-5" />Mer</button>
      </nav>
      {more && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur lg:hidden" onClick={() => setMore(false)}>
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-secondary p-4 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between"><span className="font-semibold">Meny</span><button aria-label="Stäng" onClick={() => setMore(false)}><X className="h-5 w-5" /></button></div>
            <nav className="grid grid-cols-2 gap-1">{NAV.slice(4).map((n) => navLink(n, () => setMore(false)))}</nav>
            {user && <button onClick={() => { setMore(false); supabase.auth.signOut(); }} className="mt-3 w-full rounded-lg border border-border py-2 text-sm text-muted-foreground">Logga ut</button>}
          </div>
        </div>
      )}
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
