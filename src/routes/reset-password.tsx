import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Nytt lösenord – StockLab" },
      { name: "description", content: "Välj ett nytt lösenord för ditt StockLab-konto." },
      { property: "og:title", content: "Nytt lösenord – StockLab" },
      { property: "og:description", content: "Välj ett nytt lösenord för ditt StockLab-konto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error("Länken är ogiltig eller har gått ut. Begär en ny.");
    toast.success("Lösenordet är uppdaterat.");
    nav({ to: "/portfolio" });
  }

  return (
    <div className="mx-auto mt-10 max-w-sm rounded-lg border border-border bg-card p-6">
      <h1 className="text-xl font-bold">Välj nytt lösenord</h1>
      <form onSubmit={submit} className="mt-4 grid gap-3">
        <input type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Nytt lösenord" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <button disabled={busy} className="rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? "…" : "Spara lösenord"}</button>
      </form>
    </div>
  );
}
