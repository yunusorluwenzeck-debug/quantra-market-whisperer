import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { RATE_LIMITED, takeRateSlot } from "./security.server";

export const registerPushToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ token: z.string().min(20).max(4096) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await takeRateSlot(context.userId, "save_settings"))) return { ok: false, error: RATE_LIMITED };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("push_tokens").upsert({ token: data.token, user_id: context.userId });
    if (error) return { ok: false, error: "Kunde inte spara enheten" };
    const { pushToUser } = await import("./push.server");
    await pushToUser(context.userId, "Pushnotiser påslagna", "Du får nu besked om nya och slutförda uppdrag.").catch(() => 0);
    return { ok: true, error: null };
  });

export const disablePush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("push_tokens").delete().eq("user_id", context.userId);
    return { ok: true };
  });

export const getPushStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count } = await context.supabase.from("push_tokens").select("token", { count: "exact", head: true }).eq("user_id", context.userId);
    return { devices: count ?? 0 };
  });
