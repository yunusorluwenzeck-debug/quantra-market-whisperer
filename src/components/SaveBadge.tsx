import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSaveStatus } from "@/lib/save-status";

const LABEL = { idle: "Sparat", saving: "Sparar…", saved: "Sparat", offline: "Offline", failed: "Misslyckades" } as const;
const TONE = { idle: "text-muted-foreground", saving: "text-muted-foreground", saved: "text-bull", offline: "text-bear", failed: "text-bear" } as const;

export function SaveBadge() {
  const s = useSaveStatus();
  const qc = useQueryClient();
  // After reconnecting, reload portfolio data from the server.
  useEffect(() => {
    const on = () => qc.invalidateQueries();
    window.addEventListener("online", on);
    return () => window.removeEventListener("online", on);
  }, [qc]);
  return (
    <span role="status" aria-live="polite" title="Sparstatus för din portfölj" className={`flex items-center gap-1 font-mono text-xs ${TONE[s]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />{LABEL[s]}
    </span>
  );
}
