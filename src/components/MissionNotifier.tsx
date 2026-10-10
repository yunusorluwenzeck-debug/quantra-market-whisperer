import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getPeriodicMissions } from "@/lib/progress.functions";
import { useAuth } from "@/hooks/use-auth";

type Mission = { id: string; title: string; xp: number; period: "daily" | "weekly"; claimed: boolean; met: boolean };

/**
 * Polls the periodic missions and notifies when:
 *  - a new day/week starts and fresh missions become available
 *  - a mission goal is reached and its XP can be claimed
 * Claimable count is exposed via useClaimableMissions for the nav badge.
 */
export function useMissionData() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["periodic"],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: () => getPeriodicMissions(),
  });
}

export function useClaimableMissions(): number {
  const { data } = useMissionData();
  return (data?.missions ?? []).filter((m: Mission) => m.met && !m.claimed).length;
}

export function MissionNotifier() {
  const { user } = useAuth();
  const { data } = useMissionData();
  const prev = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !data) return;
    const missions = data.missions as Mission[];
    // Signature: which missions are unclaimed, split by period.
    const sig = missions
      .filter((m) => !m.claimed)
      .map((m) => `${m.period}:${m.id}:${m.met ? 1 : 0}`)
      .sort()
      .join("|");
    if (prev.current === null) {
      prev.current = sig; // first load — no toasts
      return;
    }
    if (sig === prev.current) return;

    const prevSet = new Set(prev.current.split("|").filter(Boolean));
    const fresh = missions.filter((m) => !m.claimed && !prevSet.has(`${m.period}:${m.id}:${m.met ? 1 : 0}`));

    // New period: unclaimed missions that weren't there before at all.
    const prevIds = new Set(prev.current.split("|").filter(Boolean).map((s) => s.split(":").slice(0, 2).join(":")));
    const newDaily = fresh.filter((m) => m.period === "daily" && !prevIds.has(`daily:${m.id}`)).length;
    const newWeekly = fresh.filter((m) => m.period === "weekly" && !prevIds.has(`weekly:${m.id}`)).length;
    if (newDaily > 0) toast.info(`Nya dagliga uppdrag finns tillgängliga! (${newDaily} st)`);
    if (newWeekly > 0) toast.info(`Nya veckouppdrag finns tillgängliga! (${newWeekly} st)`);

    // A mission just became claimable (was unmet before, met now).
    for (const m of fresh) {
      if (m.met && prevSet.has(`${m.period}:${m.id}:0`)) {
        toast.success(`Uppdrag slutfört: ${m.title} — hämta +${m.xp} XP på Uppdrag-sidan!`);
      }
    }
    prev.current = sig;
  }, [data, user]);

  return null;
}
