import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Reusable game UI building blocks (cards, XP bars, stats, badges). */

export function GameCard({ children, className, glow }: { children: ReactNode; className?: string; glow?: "primary" | "gold" }) {
  return (
    <section className={cn(
      "relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
      glow === "primary" && "border-primary/40 bg-gradient-to-br from-primary/10 to-card",
      glow === "gold" && "border-gold/40 bg-gradient-to-br from-gold/10 to-card",
      className,
    )}>{children}</section>
  );
}

export function CardLabel({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{icon}{children}</div>;
}

export function XpBar({ value, max, className, tone = "primary" }: { value: number; max: number; className?: string; tone?: "primary" | "gold" }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={cn("h-3 overflow-hidden rounded-full bg-muted", className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("animate-xp h-full rounded-full", tone === "gold" ? "bg-gold" : "bg-gradient-to-r from-primary to-bull")} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function BigStat({ label, value, sub, className }: { label: string; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl font-bold tabular-nums sm:text-3xl">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function GoldBadge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full border border-gold/50 bg-gold/15 px-2.5 py-0.5 text-xs font-semibold text-gold", className)}>{children}</span>;
}

export function LevelPill({ level }: { level: string }) {
  const tone = level === "Nybörjare" ? "border-primary/40 text-primary" : level === "Medel" ? "border-gold/50 text-gold" : "border-bear/50 text-bear";
  return <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider", tone)}>{level}</span>;
}

export function Avatar({ name, level }: { name: string; level: number }) {
  const initials = name.split(/[@.\s_-]/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join("") || "S";
  return (
    <div className="relative shrink-0">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-bull text-xl font-extrabold text-primary-foreground shadow-lg">{initials}</div>
      <span className="absolute -bottom-2 -right-2 grid h-7 min-w-7 place-items-center rounded-full border-2 border-card bg-gold px-1 font-mono text-xs font-bold text-gold-foreground">{level}</span>
    </div>
  );
}

/** Short celebratory panel shown when a chapter or challenge is completed. */
export function Celebration({ title, xp, children }: { title: string; xp: number; children?: ReactNode }) {
  return (
    <div className="animate-pop rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/15 to-card p-6 text-center">
      <div className="text-5xl" aria-hidden>🏆</div>
      <h2 className="mt-2 text-2xl font-bold">{title}</h2>
      {xp > 0 ? <GoldBadge className="mt-2 text-sm">+{xp} XP</GoldBadge> : <p className="mt-2 text-sm text-muted-foreground">Redan klarat tidigare — ingen ny XP denna gång.</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
