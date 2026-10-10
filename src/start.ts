import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Security headers on every response. Framing is left allowed because the
// editor preview embeds the app in an iframe.
const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next();
  const res = (result as { response?: Response }).response ?? (result as unknown as Response);
  if (res instanceof Response) {
    try {
      res.headers.set("X-Content-Type-Options", "nosniff");
      res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
      res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
      res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
      res.headers.set("Content-Security-Policy", "object-src 'none'; base-uri 'self'; form-action 'self'");
    } catch { /* immutable headers */ }
  }
  return result;
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, securityHeadersMiddleware, csrfMiddleware],
}));
