import { useSyncExternalStore } from "react";

export type SaveState = "idle" | "saving" | "saved" | "offline" | "failed";
let state: SaveState = "idle";
const subs = new Set<() => void>();
const set = (s: SaveState) => { state = s; subs.forEach((f) => f()); };

if (typeof window !== "undefined") {
  window.addEventListener("offline", () => set("offline"));
  window.addEventListener("online", () => set(state === "offline" ? "idle" : state));
}

/** Wraps a server save. Only reports "saved" when the server confirms success. */
export async function trackSave<T extends { ok: boolean }>(fn: () => Promise<T>): Promise<T | { ok: false; error: string }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) { set("offline"); return { ok: false, error: "Du är offline — inget sparades. Försök igen när du är ansluten." }; }
  set("saving");
  try {
    const r = await fn();
    set(r.ok ? "saved" : "failed");
    return r;
  } catch {
    set(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "failed");
    return { ok: false, error: "Anslutningen bröts — affären bekräftades inte. Försök igen." };
  }
}

export function useSaveStatus() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state, () => "idle" as SaveState);
}
export const __setSaveState = set;
