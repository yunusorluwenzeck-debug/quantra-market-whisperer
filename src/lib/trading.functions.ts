import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchStock } from "./market.server";
import { currencyOf, fxRates } from "./scanner.server";
import { runBotForUser } from "./bot.server";
import { runBacktest } from "./backtest.server";

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ symbol: z.string().min(1).max(15), side: z.enum(["buy", "sell"]), amountUsd: z.number().positive().max(10_000_000).optional(), qty: z.number().positive().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const st = await fetchStock(data.symbol);
      const fx = await fxRates();
      const px = st.price * (fx[currencyOf(st.symbol)] ?? 1) * (data.side === "buy" ? 1.0005 : 0.9995);
      const qty = data.qty ?? Math.floor(((data.amountUsd ?? 0) / px) * 10000) / 10000;
      if (!qty || qty <= 0) return { ok: false, error: "Enter an amount" };
      const { error } = await supabaseAdmin.rpc("execute_paper_trade", {
        _user: context.userId, _symbol: st.symbol, _side: data.side, _qty: qty, _price: px, _source: "manual", _reason: "Manual order",
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true, error: null, qty, price: px };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Order failed" };
    }
  });

const settingsSchema = z.object({
  enabled: z.boolean(),
  regions: z.array(z.enum(["US", "EU"])).min(1),
  blocked_symbols: z.array(z.string().max(15)).max(200),
  min_score: z.number().int().min(50).max(100),
  max_positions: z.number().int().min(1).max(50),
  max_trade_usd: z.number().min(100).max(1_000_000),
  max_exposure_pct: z.number().min(5).max(100),
  daily_loss_limit_pct: z.number().min(0.5).max(50),
  max_drawdown_pct: z.number().min(1).max(90),
  stop_loss_pct: z.number().min(1).max(90),
  take_profit_pct: z.number().min(1).max(500),
  market_hours_only: z.boolean(),
});

export const saveBotSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => settingsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("bot_settings").upsert({ user_id: context.userId, ...data, updated_at: new Date().toISOString() });
    if (error) return { ok: false, error: error.message };
    await supabaseAdmin.from("bot_events").insert({ user_id: context.userId, kind: "settings", message: `Settings saved — autopilot ${data.enabled ? "ON" : "OFF"}` });
    return { ok: true, error: null };
  });

export const setEmergencyStop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ stop: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("bot_settings").upsert({ user_id: context.userId, emergency_stop: data.stop, updated_at: new Date().toISOString() });
    await supabaseAdmin.from("bot_events").insert({ user_id: context.userId, kind: data.stop ? "pause" : "resume", message: data.stop ? "EMERGENCY STOP — all new orders halted" : "Emergency stop released" });
    return { ok: true };
  });

export const runBotNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const r = await runBotForUser(context.userId);
      return { ok: true, error: null, ...r };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Run failed" };
    }
  });

export const resetPaperAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const u = context.userId;
    await supabaseAdmin.from("paper_positions").delete().eq("user_id", u);
    await supabaseAdmin.from("paper_trades").delete().eq("user_id", u);
    await supabaseAdmin.from("paper_accounts").upsert({ user_id: u, cash: 100000, starting_cash: 100000 });
    await supabaseAdmin.from("bot_settings").update({ peak_equity: null, day_start_equity: null, paused_reason: null }).eq("user_id", u);
    await supabaseAdmin.from("bot_events").insert({ user_id: u, kind: "settings", message: "Paper account reset to $100,000" });
    return { ok: true };
  });

export const backtest = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ symbol: z.string().max(15), years: z.number().int().min(1).max(10), entry: z.number().min(40).max(100), exit: z.number().min(0).max(90), stopLoss: z.number().min(1).max(90), takeProfit: z.number().min(1).max(1000) }).parse(d))
  .handler(async ({ data }) => {
    try {
      return { result: await runBacktest(data), error: null };
    } catch (e) {
      return { result: null, error: e instanceof Error ? e.message : "Backtest failed" };
    }
  });

export const getEmailStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => (await import("./email-panel.server")).emailStatus(context.supabase as never, context.userId));

export const sendTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => (await import("./email-panel.server")).testEmail(context.supabase as never, context.userId));

export const getEmailPanel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => (await import("./email-panel.server")).emailPanel(context.supabase as never, context.userId));

export const saveEmailSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ enabled: z.boolean(), min_score: z.number().int().min(60).max(100), max_sequences_per_day: z.number().int().min(1).max(20), stage_gap_minutes: z.number().int().min(30).max(1440) }).parse(d))
  .handler(async ({ data, context }) => (await import("./email-panel.server")).saveSettings(context.supabase as never, context.userId, data));
