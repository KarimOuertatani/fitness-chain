"use client";

import type { EventLog } from "ethers";
import { UserRound } from "lucide-react";
import { useContractData } from "@/hooks/useContractData";
import { useNow } from "@/hooks/useNow";
import { getContract, GYM_CONTRACTS } from "@/lib/contracts";
import { ZERO_ADDRESS, sameAddress, toSubscription } from "@/lib/mappers";
import { formatDate, joursRestants, shortAddress } from "@/lib/format";
import { AddressText } from "@/components/shared/AddressText";
import { Badge, Card, EmptyState, SkeletonList } from "@/components/ui";

/** Abonnés reconstitués à partir des événements Subscribed de la salle. */
export function GymSubscribers({ gymId }: { gymId: bigint }) {
  const now = useNow();
  const { data, loading, error } = useContractData(
    async (provider) => {
      const gm = getContract("GymManager", provider);
      const logs = await gm.queryFilter(gm.filters.Subscribed(gymId), 0, "latest");
      const members = [...new Set(logs.filter((l): l is EventLog => "args" in l).map((l) => String(l.args.member)))];
      return Promise.all(
        members.map(async (member) => ({ member, ...toSubscription(await gm.getSubscription(member, gymId)) }))
      );
    },
    ["gym-subscribers", gymId],
    { requires: GYM_CONTRACTS }
  );

  if (loading) return <SkeletonList count={2} />;
  if (error) return <p className="text-sm text-muted">Liste des abonnés indisponible : {error}</p>;
  if (!data || data.length === 0) {
    return (
      <Card>
        <EmptyState icon={UserRound} title="Aucun abonné" description="Les adhérents s'abonnent depuis l'annuaire des salles." />
      </Card>
    );
  }
  const sorted = [...data].sort((a, b) => b.endTime - a.endTime);
  return (
    <Card padding="sm">
      <ul className="flex flex-col divide-y divide-border">
        {sorted.map((s) => {
          const days = now ? joursRestants(s.endTime, now) : 0;
          const active = now ? s.endTime * 1000 > now : true;
          return (
            <li key={s.member} className="flex min-w-0 flex-wrap items-center gap-3 px-1 py-3">
              <AddressText address={s.member} chars={6} className="text-sm text-white" />
              <span className="min-w-0 flex-1 truncate text-xs text-subtle">
                {sameAddress(s.coach, ZERO_ADDRESS) ? "Sans coach" : `Coach ${shortAddress(s.coach)}`} · jusqu&apos;au {formatDate(s.endTime)}
              </span>
              <Badge tone={active ? "green" : "gray"}>{active ? `${days} j restants` : "Expiré"}</Badge>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
