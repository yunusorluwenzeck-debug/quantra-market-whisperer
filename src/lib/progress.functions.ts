import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { syncAchievements, checkAnswer } from "./progress.server";
import { takeRateSlot, RATE_LIMITED, logEvent } from "./security.server";

export const getProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await syncAchievements(context.userId).catch(() => {});
    const [a, m] = await Promise.all([
      context.supabase.from("player_achievements").select("code,xp,earned_at"),
      context.supabase.from("player_missions").select("code,xp,completed_at"),
    ]);
    const achievements = a.data ?? [];
    const missions = m.data ?? [];
    const xp = [...achievements, ...missions].reduce((s, r) => s + r.xp, 0);
    return { xp, achievements, missions };
  });

export const completeMission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().max(40), answer: z.number().int().min(0).max(5) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await takeRateSlot(context.userId, "save_settings"))) return { ok: false, error: RATE_LIMITED };
    const r = checkAnswer(data.code, data.answer);
    if (!r.ok) return { ok: false, error: r.error };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("player_missions")
      .upsert({ user_id: context.userId, code: data.code, xp: r.xp }, { onConflict: "user_id,code", ignoreDuplicates: true });
    if (error) return { ok: false, error: "Kunde inte spara uppdraget" };
    await logEvent(context.userId, "mission_completed", { code: data.code });
    return { ok: true, error: null };
  });

export const getPeriodicMissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { periodicStatus, todaysQuiz, periodicCode } = await import("./progress.server");
    const { PERIODIC } = await import("./progress");
    const st = await periodicStatus(context.userId);
    const quiz = todaysQuiz(st.keys.day);
    return {
      quiz: { q: quiz.q, options: quiz.options },
      missions: PERIODIC.map((m) => ({ ...m, claimed: st.claimed.has(periodicCode(m.id, st.keys)), met: st.met[m.id] ?? false, progress: st.progressText[m.id] ?? null })),
    };
  });

export const claimPeriodicMission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().max(20), answer: z.number().int().min(0).max(5).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await takeRateSlot(context.userId, "save_settings"))) return { ok: false, error: RATE_LIMITED };
    const { periodicStatus, todaysQuiz, periodicCode } = await import("./progress.server");
    const { PERIODIC } = await import("./progress");
    const m = PERIODIC.find((x) => x.id === data.id);
    if (!m) return { ok: false, error: "Okänt uppdrag" };
    const st = await periodicStatus(context.userId);
    const ok = m.quiz ? data.answer === todaysQuiz(st.keys.day).answer : st.met[m.id];
    if (!ok) return { ok: false, error: m.quiz ? "Fel svar — försök igen." : "Målet är inte uppnått än." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("player_missions")
      .upsert({ user_id: context.userId, code: periodicCode(m.id, st.keys), xp: m.xp }, { onConflict: "user_id,code", ignoreDuplicates: true });
    if (error) return { ok: false, error: "Kunde inte spara" };
    return { ok: true, error: null, xp: m.xp };
  });
