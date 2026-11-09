"use client";

import { useState } from "react";
import { Check, FileCheck2, Inbox, X } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useTx } from "@/hooks/useTx";
import { useContractData } from "@/hooks/useContractData";
import { getContract } from "@/lib/contracts";
import { toIds } from "@/lib/mappers";
import { readRequests, readTrainings } from "@/lib/reads";
import { formatDate, formatFTC } from "@/lib/format";
import { RequestStatus, type TrainingRequest } from "@/types";
import { AddressText } from "@/components/shared/AddressText";
import { ErrorState } from "@/components/shared/ErrorState";
import { RequestStatusBadge } from "@/components/shared/StatusBadges";
import { Button, Card, EmptyState, SkeletonList } from "@/components/ui";
import { CompleteTrainingModal } from "@/components/centre/CompleteTrainingModal";

function RequestRow({
  request,
  title,
  onComplete,
}: {
  request: TrainingRequest;
  title: string;
  onComplete: () => void;
}) {
  const { canWrite } = useWallet();
  const { run, pending } = useTx();

  const accept = () =>
    run((signer) => getContract("CoachCertificate", signer).acceptRequest(request.id), { success: "Demande acceptée." });
  const reject = () =>
    run((signer) => getContract("CoachCertificate", signer).rejectRequest(request.id), {
      success: "Demande refusée : le coach a été remboursé.",
    });

  return (
    <Card padding="sm" className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-white">{title}</p>
          <RequestStatusBadge status={request.status} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
          <span className="flex items-center gap-1">
            Coach : <AddressText address={request.coach} />
          </span>
          <span>Demande n°{request.id.toString()}</span>
          <span>{formatDate(request.createdAt)}</span>
          <span className="font-semibold text-gold">{formatFTC(request.amount)} en séquestre</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {request.status === RequestStatus.Pending && (
          <>
            <Button variant="success" size="sm" icon={Check} loading={pending} disabled={!canWrite} onClick={() => void accept()}>
              Accepter
            </Button>
            <Button variant="danger" size="sm" icon={X} disabled={!canWrite || pending} onClick={() => void reject()}>
              Refuser
            </Button>
          </>
        )}
        {request.status === RequestStatus.Accepted && (
          <Button size="sm" icon={FileCheck2} disabled={!canWrite} onClick={onComplete}>
            Valider la réussite
          </Button>
        )}
      </div>
    </Card>
  );
}

export function RequestsTab({ centerName }: { centerName: string }) {
  const { address } = useWallet();
  const [completing, setCompleting] = useState<TrainingRequest | null>(null);

  const { data, loading, error, reload } = useContractData(
    async (provider) => {
      const ids = toIds(await getContract("CoachCertificate", provider).getRequestsOfCenter(address));
      const requests = (await readRequests(provider, ids)).reverse();
      const trainingIds = [...new Set(requests.map((r) => r.trainingId.toString()))].map(BigInt);
      const trainings = await readTrainings(provider, trainingIds);
      const titles = Object.fromEntries(trainings.map((t) => [t.id.toString(), t.title]));
      return { requests, titles };
    },
    ["center-requests", address],
    { enabled: !!address }
  );

  if (loading) return <SkeletonList count={3} />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data || data.requests.length === 0) {
    return (
      <Card>
        <EmptyState icon={Inbox} title="Aucune demande reçue" description="Les demandes des coachs pour vos formations apparaîtront ici." />
      </Card>
    );
  }

  const order = [RequestStatus.Pending, RequestStatus.Accepted, RequestStatus.Completed, RequestStatus.Rejected, RequestStatus.Cancelled];
  const sorted = [...data.requests].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((r) => (
        <RequestRow
          key={r.id.toString()}
          request={r}
          title={data.titles[r.trainingId.toString()] ?? `Formation n°${r.trainingId.toString()}`}
          onComplete={() => setCompleting(r)}
        />
      ))}
      {completing && (
        <CompleteTrainingModal
          request={completing}
          trainingTitle={data.titles[completing.trainingId.toString()] ?? ""}
          centerName={centerName}
          onClose={() => setCompleting(null)}
        />
      )}
    </div>
  );
}
