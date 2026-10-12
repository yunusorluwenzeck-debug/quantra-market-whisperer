import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { takeRateSlot, RATE_LIMITED, logEvent } from "./security.server";
import { CHAPTERS, SCENARIOS, tutorialCode, challengeCode, REACTIONS, type ReactionId } from "./game";

/** Everything the game home screen needs, in one call. */
export const getHome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { syncAchievements } = await import("./progress.server");
    const { streakFrom } = await import("./game.server");
    await syncAchievements(context.userId).catch(() => {});
    const sb = context.supabase;
    const [a, m, acc, pos, trades, runs] = await Promise.all([
      sb.from("player_achievements").select("code,xp,earned_at").order("earned_at", { ascending: false }),
      sb.from("player_missions").select("code,xp,completed_at"),
      sb.from("paper_accounts").select("cash,starting_cash").maybeSingle(),
      sb.from("paper_positions").select("symbol,qty,avg_cost"),
      sb.from("paper_trades").select("created_at").order("created_at", { ascending: false }).limit(200),
      sb.from("challenge_runs").select("scenario_id,score,completed_at").order("completed_at", { ascending: false }).limit(50),
    ]);
    const achievements = a.data ?? [];
    const missions = m.data ?? [];
    const xp = [...achievements, ...missions].reduce((s, r) => s + r.xp, 0);
    const syms = (pos.data ?? []).map((p) => p.symbol);
    const { data: px } = syms.length ? await sb.from("stocks").select("symbol,price_usd").in("symbol", syms) : { data: [] };
    const price = new Map((px ?? []).map((p) => [p.symbol, p.price_usd]));
    const held = (pos.data ?? []).reduce((s, p) => s + Number(p.qty) * Number(price.get(p.symbol) ?? p.avg_cost), 0);
    const cash = acc.data ? Number(acc.data.cash) : 100000;
    const starting = acc.data ? Number(acc.data.starting_cash) : 100000;
    const codes = new Set(missions.map((x) => x.code));
    const tutorialDone = CHAPTERS.filter((c) => codes.has(tutorialCode(c.n))).map((c) => c.n);
    const bestByScenario: Record<string, number> = {};
    for (const r of runs.data ?? []) bestByScenario[r.scenario_id] = Math.max(bestByScenario[r.scenario_id] ?? 0, r.score);
    const streak = streakFrom([
      ...(trades.data ?? []).map((t) => t.created_at),
      ...missions.map((x) => x.completed_at),
      ...(runs.data ?? []).map((r) => r.completed_at),
    ]);
    return {
      xp,
      achievementCodes: achievements.map((x) => x.code),
      latestAchievement: achievements[0] ? { code: achievements[0].code, earnedAt: achievements[0].earned_at } : null,
      learningMissions: missions.filter((x) => !/^[dwtc]:/.test(x.code)).length,
      portfolioUsd: cash + held,
      cashUsd: cash,
      returnPct: starting > 0 ? ((cash + held) / starting - 1) * 100 : 0,
      tutorialDone,
      challengesPassed: SCENARIOS.filter((s) => codes.has(challengeCode(s.id))).map((s) => s.id),
      bestByScenario,
      streak,
    };
  });

export const completeChapter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ n: z.number().int().min(1).max(7), answer: z.number().int().min(0).max(5) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await takeRateSlot(context.userId, "save_settings"))) return { ok: false, error: RATE_LIMITED, xp: 0, replay: false };
    const { CHAPTER_ANSWERS } = await import("./game.server");
    const ch = CHAPTERS.find((c) => c.n === data.n)!;
    if (CHAPTER_ANSWERS[data.n] !== data.answer) return { ok: false, error: "Inte riktigt — läs igen och försök en gång till.", xp: 0, replay: false };
    const sb = context.supabase;
    const { data: done } = await sb.from("player_missions").select("code").like("code", "t:%");
    const doneSet = new Set((done ?? []).map((x) => x.code));
    if (data.n > 1 && !doneSet.has(tutorialCode(data.n - 1))) return { ok: false, error: "Klara föregående kapitel först.", xp: 0, replay: false };
    if (doneSet.has(tutorialCode(data.n))) return { ok: true, error: null, xp: 0, replay: true };
    if (ch.exercise === "real-trade") {
      const { count } = await sb.from("paper_trades").select("id", { count: "exact", head: true }).eq("side", "buy");
      if (!count) return { ok: false, error: "Gör först ett virtuellt köp under Marknaden.", xp: 0, replay: false };
    }
    if (ch.exercise === "challenge") {
      const { count } = await sb.from("challenge_runs").select("id", { count: "exact", head: true });
      if (!count) return { ok: false, error: "Spela klart en börsutmaning först.", xp: 0, replay: false };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("player_missions")
      .upsert({ user_id: context.userId, code: tutorialCode(data.n), xp: ch.xp }, { onConflict: "user_id,code", ignoreDuplicates: true });
    if (error) return { ok: false, error: "Kunde inte spara framsteget", xp: 0, replay: false };
    await logEvent(context.userId, "tutorial_chapter", { n: data.n });
    return { ok: true, error: null, xp: ch.xp, replay: false };
  });

export const submitChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    scenarioId: z.string().max(40),
    weights: z.record(z.string().max(30), z.number().int().min(0).max(100)),
    reaction: z.enum(REACTIONS.map((r) => r.id) as [ReactionId, ...ReactionId[]]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await takeRateSlot(context.userId, "save_settings"))) return { ok: false as const, error: RATE_LIMITED };
    const { runChallenge, CHALLENGE_XP } = await import("./game.server");
    const result = runChallenge(data);
    if ("error" in result) return { ok: false as const, error: result.error };
    const sc = SCENARIOS.find((s) => s.id === data.scenarioId)!;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("challenge_runs").insert({
      user_id: context.userId, scenario_id: sc.id, choices: { weights: data.weights, reaction: data.reaction }, score: result.score, result,
    });
    if (error) return { ok: false as const, error: "Kunde inte spara resultatet" };
    let xpEarned = 0;
    if (result.passed) {
      const { data: ins } = await supabaseAdmin.from("player_missions")
        .upsert({ user_id: context.userId, code: challengeCode(sc.id), xp: CHALLENGE_XP[sc.level] }, { onConflict: "user_id,code", ignoreDuplicates: true })
        .select("code");
      if (ins?.length) xpEarned = CHALLENGE_XP[sc.level];
    }
    await logEvent(context.userId, "challenge_completed", { id: sc.id, score: result.score });
    return { ok: true as const, result, xpEarned };
  });
