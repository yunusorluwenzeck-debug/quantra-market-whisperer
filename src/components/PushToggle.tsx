import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { disablePush, getPushStatus, registerPushToken } from "@/lib/push.functions";

const appId = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID as string | undefined;
const vapidKey = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY as string | undefined;
const cfg = {
  apiKey: (import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY as string | undefined) ?? "",
  projectId: (import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID as string | undefined) ?? "",
  appId: appId ?? "",
  messagingSenderId: appId?.split(":")[1] ?? "",
};

async function getDeviceToken(): Promise<{ token?: string; msg?: string }> {
  if (!cfg.apiKey || !cfg.projectId || !appId || !vapidKey || !cfg.messagingSenderId) return { msg: "Pushnotiser är inte konfigurerade än." };
  const { isSupported, getMessaging, getToken } = await import("firebase/messaging");
  const { initializeApp, getApps } = await import("firebase/app");
  if (!("Notification" in window) || !(await isSupported())) return { msg: "Din webbläsare stöder inte pushnotiser. På iPhone: lägg till StockLab på hemskärmen först." };
  if (window.top !== window.self) return { msg: "Öppna appen i en egen flik (eller den publicerade sidan) för att slå på notiser." };
  const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (perm !== "granted") return { msg: "Notiser är blockerade. Tillåt dem i webbläsarens webbplatsinställningar." };
  const reg = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${new URLSearchParams(cfg)}`);
  const app = getApps()[0] ?? initializeApp(cfg);
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: reg });
  return token ? { token } : { msg: "Kunde inte registrera enheten." };
}

export function PushToggle() {
  const status = useServerFn(getPushStatus), reg = useServerFn(registerPushToken), off = useServerFn(disablePush);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["push"], queryFn: () => status() });
  const [busy, setBusy] = useState(false);
  const on = (data?.devices ?? 0) > 0;

  async function enable() {
    setBusy(true);
    try {
      const r = await getDeviceToken();
      if (!r.token) { toast.error(r.msg); return; }
      const s = await reg({ data: { token: r.token } });
      if (!s.ok) toast.error(s.error); else toast.success("Pushnotiser påslagna på den här enheten");
    } catch { toast.error("Kunde inte slå på pushnotiser"); }
    finally { setBusy(false); qc.invalidateQueries({ queryKey: ["push"] }); }
  }
  async function disable() {
    setBusy(true); await off(); setBusy(false);
    qc.invalidateQueries({ queryKey: ["push"] }); toast.success("Pushnotiser avstängda");
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
      <div>
        <div className="text-sm font-semibold">Pushnotiser {on && <span className="ml-1 text-xs text-primary">● På ({data?.devices} enhet{data?.devices === 1 ? "" : "er"})</span>}</div>
        <p className="text-xs text-muted-foreground">Få besked på din enhet om nya uppdrag och när du klarat ett — även när appen är stängd.</p>
      </div>
      <div className="flex gap-2">
        <button disabled={busy} onClick={enable} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">{on ? "Lägg till denna enhet" : "Slå på"}</button>
        {on && <button disabled={busy} onClick={disable} className="rounded-md border border-border px-3 py-1.5 text-xs">Stäng av</button>}
      </div>
    </div>
  );
}
