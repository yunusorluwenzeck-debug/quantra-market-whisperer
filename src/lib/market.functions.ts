import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchStock } from "./market.server";

export const getStock = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ symbol: z.string().regex(/^[A-Za-z0-9.\-^=]{1,15}$/) }).parse(d))
  .handler(async ({ data }) => {
    try {
      return { stock: await fetchStock(data.symbol), error: null };
    } catch (e) {
      return { stock: null, error: e instanceof Error ? e.message : "Failed" };
    }
  });

export const getQuotes = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ symbols: z.array(z.string().regex(/^[A-Za-z0-9.\-^=]{1,15}$/)).max(20) }).parse(d))
  .handler(async ({ data }) => {
    const out = await Promise.all(
      data.symbols.map(async (s) => {
        try {
          const st = await fetchStock(s);
          return { symbol: st.symbol, price: st.price, changePct: st.changePct, spark: st.candles.slice(-30).map((c) => c.c) };
        } catch {
          return null;
        }
      }),
    );
    return out.filter((x) => x !== null);
  });
