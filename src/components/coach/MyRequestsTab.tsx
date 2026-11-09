"use client";

import { Inbox, Undo2 } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useTx } from "@/hooks/useTx";
import { useContractData } from "@/hooks/useContractData";
import { getContract } from "@/lib/contracts";
import { toCenter, toIds } from "@/lib/mappers";
import { readRequests, readTrainings } from "@/lib/reads";
import { formatDate, formatFTC } from "@/lib/format";
import { RequestStatus, type TrainingRequest } from "@/types";
import { ErrorState } from "@/components/shared/ErrorState";
import { RequestStatusBadge } from "@/components/shared/StatusBadges";
import { Button, Card, EmptyState, SkeletonList } from "@/components/ui";

function MyRequestRow({ request, title, centerName, centerActive }: { request: TrainingRequest; title: string; centerName: string; centerActive: boolean }) {
  const { canWrite } = useWallet();
  const { run, pending } = useTx();
  const cancellable =
    request.status === RequestStatus.Pending || (request.status === RequestStatus.Accepted && !centerActive);

  const cancel = () =>
    run((signer) => getContract("CoachCertificate", signer).cancelRequest(request.id), {
      success: `Demande annulée : ${formatFTC(request.amount)} remboursés.`,
    });

  return (
    <Card padding="sm" className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-white">{title}</p>
          <RequestStatusBadge status={request.status} />
        </div>
        <p className="mt-1 text-xs text-subtle">
          {centerName || "Centre"}
          {!centerActive && " (exclu)"} · Demande n°{request.id.toString()} · {formatDate(request.createdAt)} ·{" "}
          <span className="font-semibold text-gold">{formatFTC(request.amount)}</span>
        </p>
        {request.status === RequestStatus.Accepted && !centerActive && (
          <p className="mt-1 text-xs text-orange">Le centre a été exclu : vous pouvez annuler pour être remboursé.</p>
        )}
      </div>
      {cancellable && (
        <Button variant="danger" size="sm" icon={Undo2} loading={pending} disabled={!canWrite} onClick={() => void cancel()}>
          Annuler
        </Button>
      )}
    </Card>
  );
}

export function MyRequestsTab() {
  const { address } = useWallet();
  const { data, loading, error, reload } = useContractData(
    async (provider) => {
      const dao = getContract("CenterDAO", provider);
      const ids = toIds(await getContract("CoachCertificate", provider).getRequestsOfCoach(address));
      const requests = (await readRequests(provider, ids)).reverse();
      const trainingIds = [...new Set(requests.map((r) => r.trainingId.toString()))].map(BigInt);
      const trainings = await readTrainings(provider, trainingIds);
      const centerAddrs = [...new Set(requests.map((r) => r.center.toLowerCase()))];
      const centers = Object.fromEntries(await Promise.all(centerAddrs.map(async (a) => [a, toCenter(await dao.centers(a))] as const)));
      return { requests, titles: Object.fromEntries(trainings.map((t) => [t.id.toString(), t.title])), centers };
    },
    ["coach-requests", address],
    { enabled: !!address }
  );

  if (loading) return <SkeletonList count={3} />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data || data.requests.length === 0) {
    return (
      <Card>
        <EmptyState icon={Inbox} title="Aucune demande" description="Demandez une formation depuis le catalogue pour commencer." />
      </Card>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {data.requests.map((r) => {
        const center = data.centers[r.center.toLowerCase()];
        return (
          <MyRequestRow
            key={r.id.toString()}
            request={r}
            title={data.titles[r.trainingId.toString()] ?? `Formation n°${r.trainingId.toString()}`}
            centerName={center?.name ?? ""}
            centerActive={center?.active ?? false}
          />
        );
      })}
    </div>
  );
}
