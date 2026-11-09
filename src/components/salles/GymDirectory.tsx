"use client";

import { GYM_CONTRACTS } from "@/lib/contracts";
import Link from "next/link";
import { ArrowRight, Building2, Users } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useContractData } from "@/hooks/useContractData";
import { useMetadata } from "@/hooks/useMetadata";
import { readAllGyms, readGymCoaches } from "@/lib/reads";
import { formatFTC } from "@/lib/format";
import type { Gym } from "@/types";
import { ErrorState } from "@/components/shared/ErrorState";
import { IpfsImage } from "@/components/shared/IpfsImage";
import { NotDeployedState } from "@/components/shared/NotDeployedState";
import { Badge, Card, EmptyState, PageHeader, SkeletonList } from "@/components/ui";

function GymCard({ gym, coachCount }: { gym: Gym; coachCount: number }) {
  const { metadata } = useMetadata(gym.metadataURI);
  return (
    <Link href={`/salles/${gym.id.toString()}`} className="group block rounded-3xl">
      <Card padding="none" interactive className="flex h-full flex-col overflow-hidden">
        <IpfsImage uri={metadata?.image} alt={gym.name} className="h-40" fallbackIcon={Building2} />
        <div className="flex flex-1 flex-col gap-3 p-5">
          <p className="truncate text-lg font-bold text-white">{gym.name}</p>
          {metadata?.description && <p className="line-clamp-2 text-sm text-muted">{metadata.description}</p>}
          <div className="mt-auto flex items-center justify-between gap-3 pt-2">
            <div>
              <p className="text-xl font-extrabold text-gold">{formatFTC(gym.monthlyFee)}</p>
              <p className="text-xs text-subtle">par mois</p>
            </div>
            <Badge tone="cyan" icon={Users}>
              {coachCount} coach{coachCount > 1 ? "s" : ""}
            </Badge>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan">
            Voir la salle <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden />
          </span>
        </div>
      </Card>
    </Link>
  );
}

export function GymDirectory() {
  const { isAvailable } = useWallet();
  const deployed = isAvailable(GYM_CONTRACTS);
  const { data, loading, error, reload } = useContractData(async (provider) => {
    const gyms = (await readAllGyms(provider)).filter((g) => g.active);
    const counts = await Promise.all(gyms.map(async (g) => (await readGymCoaches(provider, g.id)).length));
    return gyms.map((gym, i) => ({ gym, coachCount: counts[i] }));
  }, ["gym-directory"], { requires: GYM_CONTRACTS });

  return (
    <>
      <PageHeader title="Salles" subtitle="Trouvez une salle, choisissez votre coach privé certifié et payez en FitCoin." />
      {!deployed ? (
        <NotDeployedState what="les salles" />
      ) : loading ? (
        <SkeletonList count={3} className="md:grid-cols-2 xl:grid-cols-3" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data || data.length === 0 ? (
        <Card>
          <EmptyState icon={Building2} title="Aucune salle active" description="Les salles inscrites sur Fitness Chain apparaîtront ici." />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map(({ gym, coachCount }) => (
            <GymCard key={gym.id.toString()} gym={gym} coachCount={coachCount} />
          ))}
        </div>
      )}
    </>
  );
}
