"use client";

import { useState } from "react";
import { BookOpen, CalendarClock, Landmark, Send, ShieldCheck } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useContractData } from "@/hooks/useContractData";
import { useMetadata } from "@/hooks/useMetadata";
import { getContract } from "@/lib/contracts";
import { toCenter, toIds } from "@/lib/mappers";
import { readAllTrainings, readRequests } from "@/lib/reads";
import { formatFTC, pluralDays } from "@/lib/format";
import { RequestStatus, type Training } from "@/types";
import { ErrorState } from "@/components/shared/ErrorState";
import { IpfsImage } from "@/components/shared/IpfsImage";
import { PaymentModal } from "@/components/wallet/PaymentModal";
import { Badge, Button, Card, EmptyState, SkeletonList } from "@/components/ui";

interface CatalogEntry {
  training: Training;
  centerName: string;
  alreadyRequested: boolean;
}

function TrainingCatalogCard({ entry, onRequest }: { entry: CatalogEntry; onRequest: () => void }) {
  const { canWrite } = useWallet();
  const { training } = entry;
  const { metadata } = useMetadata(training.metadataURI);
  return (
    <Card padding="none" interactive className="flex flex-col overflow-hidden">
      <IpfsImage uri={metadata?.image} alt={training.title} className="h-36" fallbackIcon={BookOpen} />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <p className="text-base font-bold text-white">{training.title}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <Landmark className="size-4" aria-hidden /> {entry.centerName || "Centre agréé"}
          </p>
        </div>
        {metadata?.description && <p className="line-clamp-3 text-sm text-muted">{metadata.description}</p>}
        <div className="flex flex-wrap gap-2">
          <Badge tone="violet" icon={CalendarClock}>
            {pluralDays(training.durationDays)}
          </Badge>
          <Badge tone="cyan" icon={ShieldCheck}>
            {training.validityDays === 0 ? "Sans expiration" : `Valide ${pluralDays(training.validityDays)}`}
          </Badge>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <span className="text-lg font-extrabold text-gold">{formatFTC(training.price)}</span>
          {entry.alreadyRequested ? (
            <Badge tone="yellow">Déjà demandée</Badge>
          ) : (
            <Button size="sm" icon={Send} disabled={!canWrite} onClick={onRequest}>
              Demander
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export function CatalogTab() {
  const { address } = useWallet();
  const [selected, setSelected] = useState<CatalogEntry | null>(null);

  const { data, loading, error, reload } = useContractData(
    async (provider): Promise<CatalogEntry[]> => {
      const dao = getContract("CenterDAO", provider);
      const certificate = getContract("CoachCertificate", provider);
      const trainings = (await readAllTrainings(provider)).filter((t) => t.active);
      const centerAddresses = [...new Set(trainings.map((t) => t.center.toLowerCase()))];
      const centers = new Map(
        await Promise.all(
          centerAddresses.map(async (a) => [a, toCenter(await dao.centers(a))] as const)
        )
      );
      const myRequests = address ? await readRequests(provider, toIds(await certificate.getRequestsOfCoach(address))) : [];
      const open = new Set(
        myRequests
          .filter((r) => r.status === RequestStatus.Pending || r.status === RequestStatus.Accepted)
          .map((r) => r.trainingId.toString())
      );
      return trainings
        .filter((t) => centers.get(t.center.toLowerCase())?.active)
        .map((t) => ({
          training: t,
          centerName: centers.get(t.center.toLowerCase())?.name ?? "",
          alreadyRequested: open.has(t.id.toString()),
        }))
        .reverse();
    },
    ["catalog", address]
  );

  if (loading) return <SkeletonList count={3} />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data || data.length === 0) {
    return (
      <Card>
        <EmptyState icon={BookOpen} title="Aucune formation disponible" description="Les formations publiées par les centres agréés apparaîtront ici." />
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map((entry) => (
          <TrainingCatalogCard key={entry.training.id.toString()} entry={entry} onRequest={() => setSelected(entry)} />
        ))}
      </div>
      {selected && (
        <PaymentModal
          open
          onClose={() => setSelected(null)}
          title={`Demander « ${selected.training.title} »`}
          description="Le prix est placé en séquestre : il est versé au centre à la validation, ou remboursé en cas de refus."
          amount={selected.training.price}
          spender="CoachCertificate"
          lines={[
            { label: "Centre", value: selected.centerName || "—" },
            { label: "Durée", value: pluralDays(selected.training.durationDays) },
          ]}
          payLabel="Payer"
          successMessage="Demande envoyée au centre."
          onPay={(signer) => getContract("CoachCertificate", signer).requestTraining(selected.training.id)}
        />
      )}
    </>
  );
}
