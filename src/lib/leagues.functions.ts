import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { takeRateSlot, RATE_LIMITED, logEvent } from "./security.server";

const nameSchema = z.string().trim().min(2).max(24);
const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");

/** Leagues the caller belongs to, each with a leaderboard of members' virtual returns (names and % only). */
export const getMyLeagues = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const { data: mine } = await db.from("league_members").select("league_id").eq("user_id", context.userId);
    const ids = (mine ?? []).map((m) => m.league_id);
    if (!ids.length) return [];
    const [{ data: leagues }, { data: members }] = await Promise.all([
      db.from("leagues").select("id,name,code,owner_id").in("id", ids),
      db.from("league_members").select("league_id,user_id,display_name").in("league_id", ids),
    ]);
    const users = [...new Set((members ?? []).map((m) => m.user_id))];
    const [{ data: accts }, { data: pos }] = await Promise.all([
      db.from("paper_accounts").select("user_id,cash,starting_cash").in("user_id", users),
      db.from("paper_positions").select("user_id,symbol,qty,avg_cost").in("user_id", users),
    ]);
    const syms = [...new Set((pos ?? []).map((p) => p.symbol))];
    const { data: px } = syms.length ? await db.from("stocks").select("symbol,price_usd").in("symbol", syms) : { data: [] };
    const price = new Map((px ?? []).map((p) => [p.symbol, p.price_usd]));
    const ret = new Map<string, number>();
    for (const u of users) {
      const a = accts?.find((x) => x.user_id === u);
      if (!a) { ret.set(u, 0); continue; }
      const held = (pos ?? []).filter((p) => p.user_id === u).reduce((s, p) => s + p.qty * (price.get(p.symbol) ?? p.avg_cost), 0);
      ret.set(u, a.starting_cash > 0 ? ((a.cash + held) / a.starting_cash - 1) * 100 : 0);
    }
    return (leagues ?? []).map((l) => ({
      id: l.id, name: l.name, code: l.code, isOwner: l.owner_id === context.userId,
      board: (members ?? []).filter((m) => m.league_id === l.id)
        .map((m) => ({ name: m.display_name, me: m.user_id === context.userId, returnPct: ret.get(m.user_id) ?? 0 }))
        .sort((a, b) => b.returnPct - a.returnPct),
    }));
  });

export const createLeague = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ name: z.string().trim().min(2).max(40), displayName: nameSchema }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await takeRateSlot(context.userId, "save_settings"))) return { ok: false, error: RATE_LIMITED };
    const db = await admin();
    const { count } = await db.from("leagues").select("id", { count: "exact", head: true }).eq("owner_id", context.userId);
    if ((count ?? 0) >= 10) return { ok: false, error: "Du kan skapa högst 10 ligor" };
    const { data: l, error } = await db.from("leagues").insert({ name: data.name, code: newCode(), owner_id: context.userId }).select("id").single();
    if (error || !l) return { ok: false, error: "Kunde inte skapa ligan" };
    await db.from("league_members").insert({ league_id: l.id, user_id: context.userId, display_name: data.displayName });
    await logEvent(context.userId, "league_created", {});
    return { ok: true, error: null };
  });

export const joinLeague = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/), displayName: nameSchema }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await takeRateSlot(context.userId, "save_settings"))) return { ok: false, error: RATE_LIMITED };
    const db = await admin();
    const { data: l } = await db.from("leagues").select("id").eq("code", data.code).maybeSingle();
    if (!l) return { ok: false, error: "Ingen liga med den koden" };
    const { count } = await db.from("league_members").select("user_id", { count: "exact", head: true }).eq("league_id", l.id);
    if ((count ?? 0) >= 50) return { ok: false, error: "Ligan är full" };
    const { error } = await db.from("league_members").upsert({ league_id: l.id, user_id: context.userId, display_name: data.displayName }, { onConflict: "league_id,user_id" });
    if (error) return { ok: false, error: "Kunde inte gå med" };
    return { ok: true, error: null };
  });

export const leaveLeague = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: l } = await db.from("leagues").select("owner_id").eq("id", data.id).maybeSingle();
    if (l?.owner_id === context.userId) await db.from("leagues").delete().eq("id", data.id);
    else await db.from("league_members").delete().eq("league_id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });
