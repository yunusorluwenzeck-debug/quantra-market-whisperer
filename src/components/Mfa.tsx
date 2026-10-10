import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/AppShell";

const input = "rounded-md border border-input bg-background px-3 py-2 text-center font-mono text-lg tracking-[0.4em]";

/** Blocks the app after sign-in until the 6-digit code is entered, for users who turned on two-step verification. */
export function MfaGate() {
  const { user } = useAuth();
  const [need, setNeed] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!user) { setNeed(false); return; }
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
      setNeed(!!data && data.nextLevel === "aal2" && data.currentLevel !== "aal2");
    });
  }, [user]);
  if (!need) return null;

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: f } = await supabase.auth.mfa.listFactors();
      const factor = f?.totp.find((x) => x.status === "verified");
      if (!factor) throw new Error("Ingen verifieringsapp hittades");
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
      if (error) throw error;
      setNeed(false);
      setCode("");
    } catch {
      toast.error("Fel kod. Försök igen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/95 p-4 backdrop-blur">
      <form onSubmit={verify} className="grid w-full max-w-sm gap-3 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-bold">Tvåstegsverifiering</h2>
        <p className="text-sm text-muted-foreground">Ange den 6-siffriga koden från din autentiseringsapp.</p>
        <input autoFocus inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className={input} placeholder="000000" />
        <button disabled={busy || code.length !== 6} className="rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? "…" : "Verifiera"}</button>
        <button type="button" onClick={() => supabase.auth.signOut()} className="text-xs text-muted-foreground hover:text-foreground">Logga ut</button>
      </form>
    </div>
  );
}

/** Lets a signed-in user turn on or off two-step verification with an authenticator app. */
export function MfaSettings() {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [setup, setSetup] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactorId(data?.totp.find((f) => f.status === "verified")?.id ?? null);
  }
  useEffect(() => { load(); }, []);

  async function start() {
    setBusy(true);
    const { data: all } = await supabase.auth.mfa.listFactors();
    for (const f of all?.all ?? []) if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `StockLab ${Date.now()}` });
    setBusy(false);
    if (error || !data) { toast.error("Kunde inte starta tvåstegsverifiering."); return; }
    setSetup({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }
  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!setup) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: setup.id, code: code.trim() });
    setBusy(false);
    if (error) { toast.error("Fel kod. Försök igen."); return; }
    toast.success("Tvåstegsverifiering är på.");
    setSetup(null); setCode(""); load();
  }
  async function disable() {
    if (!factorId || !window.confirm("Stänga av tvåstegsverifiering?")) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (error) { toast.error("Kunde inte stänga av. Logga in med kod först och försök igen."); return; }
    toast.success("Tvåstegsverifiering är avstängd.");
    load();
  }

  return (
    <Card title="Tvåstegsverifiering (valfritt)">
      <div className="grid gap-3 p-4 text-sm">
        {factorId ? (
          <>
            <p><span className="rounded bg-primary/15 px-2 py-0.5 font-mono text-xs text-primary">PÅ</span> Vid inloggning behövs en kod från din autentiseringsapp.</p>
            <button onClick={disable} disabled={busy} className="w-fit rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent">Stäng av</button>
          </>
        ) : setup ? (
          <form onSubmit={confirm} className="grid max-w-sm gap-3">
            <p className="text-muted-foreground">Skanna QR-koden med t.ex. Google Authenticator eller Microsoft Authenticator och skriv in koden som visas.</p>
            <img src={setup.qr} alt="QR-kod för autentiseringsapp" className="h-44 w-44 rounded bg-white p-2" />
            <p className="break-all font-mono text-[11px] text-muted-foreground">Eller ange nyckeln: {setup.secret}</p>
            <input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className={input} placeholder="000000" />
            <div className="flex gap-2">
              <button disabled={busy || code.length !== 6} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">Aktivera</button>
              <button type="button" onClick={() => setSetup(null)} className="rounded-md border border-border px-3 py-1.5 text-xs">Avbryt</button>
            </div>
          </form>
        ) : (
          <>
            <p className="text-muted-foreground">Skydda kontot med en extra kod från en autentiseringsapp i mobilen. Gäller både lösenord och Google-inloggning.</p>
            <button onClick={start} disabled={busy} className="w-fit rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">Slå på</button>
          </>
        )}
      </div>
    </Card>
  );
}
