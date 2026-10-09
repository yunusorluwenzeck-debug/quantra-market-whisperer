import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/AppShell";
import { ROW_COLS, StockTable, type Row } from "@/components/StockTable";

export const Route = createFileRoute("/_authenticated/lists")({
  head: () => ({
    meta: [
      { title: "My stock lists | Quantra" },
      { name: "description", content: "Organize stocks into your own custom lists and revisit their scores anytime." },
      { property: "og:title", content: "My stock lists | Quantra" },
      { property: "og:description", content: "Organize stocks into your own custom lists and revisit their scores anytime." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Lists,
});

function Lists() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [add, setAdd] = useState("");
  const { data: lists } = useQuery({
    queryKey: ["lists"],
    queryFn: async () => (await supabase.from("stock_lists").select("id,name,symbols").order("created_at")).data ?? [],
  });
  const cur = lists?.find((l) => l.id === active) ?? lists?.[0];
  const { data: rows } = useQuery({
    queryKey: ["list-rows", cur?.symbols], enabled: !!cur?.symbols.length,
    queryFn: async () => (await supabase.from("stocks").select(ROW_COLS).in("symbol", cur!.symbols)).data as Row[] ?? [],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["lists"] });
  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const { data, error } = await supabase.from("stock_lists").insert({ name: name.trim() }).select("id").single();
    if (error) { toast.error(error.message); return; }
    setName(""); setActive(data.id); refresh();
  }
  async function addSym(e: React.FormEvent) {
    e.preventDefault();
    const s = add.trim().toUpperCase();
    if (!s || !cur) return;
    const { data: ok } = await supabase.from("stocks").select("symbol").eq("symbol", s).maybeSingle();
    if (!ok) { toast.error(`${s} isn't in our tracked universe`); return; }
    await supabase.from("stock_lists").update({ symbols: [...new Set([...cur.symbols, s])] }).eq("id", cur.id);
    setAdd(""); refresh();
  }
  return (
    <div className="grid gap-6 md:grid-cols-[240px_1fr]">
      <Card title="My lists">
        <ul>
          {lists?.map((l) => (
            <li key={l.id}><button onClick={() => setActive(l.id)} className={`flex w-full justify-between border-l-2 px-4 py-2.5 text-left text-sm hover:bg-accent ${cur?.id === l.id ? "border-primary bg-accent" : "border-transparent"}`}>{l.name}<span className="font-mono text-xs text-muted-foreground">{l.symbols.length}</span></button></li>
          ))}
        </ul>
        <form onSubmit={create} className="flex gap-2 border-t border-border p-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New list name" className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
          <button className="rounded-md bg-primary px-3 font-mono text-xs font-semibold text-primary-foreground">Add</button>
        </form>
      </Card>
      {cur ? (
        <Card title={cur.name} right={
          <div className="flex gap-3">
            <button onClick={async () => { const n = prompt("Rename list", cur.name); if (n?.trim()) { await supabase.from("stock_lists").update({ name: n.trim() }).eq("id", cur.id); refresh(); } }} className="font-mono text-xs text-muted-foreground hover:text-foreground">Rename</button>
            <button onClick={async () => { if (confirm(`Delete "${cur.name}"?`)) { await supabase.from("stock_lists").delete().eq("id", cur.id); setActive(null); refresh(); } }} className="font-mono text-xs text-bear">Delete</button>
          </div>}>
          <form onSubmit={addSym} className="flex gap-2 border-b border-border p-3">
            <input value={add} onChange={(e) => setAdd(e.target.value)} placeholder="Add ticker, e.g. ASML.AS" className="w-56 rounded-md border border-input bg-background px-2 py-1.5 font-mono text-sm uppercase" />
            <button className="rounded-md border border-border px-3 font-mono text-xs">Add stock</button>
          </form>
          {!cur.symbols.length ? <p className="p-4 text-sm text-muted-foreground">Empty list. Add tickers here or from any stock page.</p> : (
            <>
              <StockTable rows={rows ?? []} />
              <div className="flex flex-wrap gap-2 p-3">
                {cur.symbols.map((s) => (
                  <button key={s} onClick={async () => { await supabase.from("stock_lists").update({ symbols: cur.symbols.filter((x) => x !== s) }).eq("id", cur.id); refresh(); }} className="rounded border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground hover:text-bear">✕ {s}</button>
                ))}
              </div>
            </>
          )}
        </Card>
      ) : <p className="text-sm text-muted-foreground">Create your first list to start organizing stocks.</p>}
    </div>
  );
}
