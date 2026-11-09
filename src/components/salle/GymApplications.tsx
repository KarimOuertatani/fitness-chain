"use client";

import { Check, Send, X } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useTx } from "@/hooks/useTx";
import { useContractData } from "@/hooks/useContractData";
import { getContract, GYM_CONTRACTS } from "@/lib/contracts";
import { toIds } from "@/lib/mappers";
import { readApplications, readCertificatesOf, readTrainings } from "@/lib/reads";
import { formatDate, formatFTC } from "@/lib/format";
import { ApplicationStatus, type Application } from "@/types";
import { AddressText } from "@/components/shared/AddressText";
import { ErrorState } from "@/components/shared/ErrorState";
import { ApplicationStatusBadge, CertStatusBadge } from "@/components/shared/StatusBadges";
import { Button, ButtonLink, Card, EmptyState, SkeletonList } from "@/components/ui";

function ApplicationCard({
  application,
  certificates,
}: {
  application: Application;
  certificates: { id: bigint; status: number; title: string }[];
}) {
  const { canWrite } = useWallet();
  const { run, pending } = useTx();
  const accept = () =>
    run((signer) => getContract("GymManager", signer).acceptCoach(application.id), {
      success: "Coach accepté : les frais d'affiliation vous ont été versés.",
    });
  const reject = () =>
    run((signer) => getContract("GymManager", signer).rejectCoach(application.id), {
      success: "Candidature refusée : le coach a été remboursé.",
    });

  return (
    <Card padding="sm" className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <AddressText address={application.coach} chars={6} className="text-sm text-white" />
            <ApplicationStatusBadge status={application.status} />
          </div>
          <p className="mt-1 text-xs text-subtle">
            {formatDate(application.createdAt)} · coaching {formatFTC(application.coachingPrice)} / mois · affiliation{" "}
            {formatFTC(application.amount)}
          </p>
        </div>
        {application.status === ApplicationStatus.Pending && (
          <div className="flex shrink-0 gap-2">
            <Button variant="success" size="sm" icon={Check} loading={pending} disabled={!canWrite} onClick={() => void accept()}>
              Accepter
            </Button>
            <Button variant="danger" size="sm" icon={X} disabled={!canWrite || pending} onClick={() => void reject()}>
              Refuser
            </Button>
          </div>
        )}
      </div>
      <div className="rounded-2xl bg-white/[0.04] p-3">
        <p className="mb-2 text-xs font-semibold text-muted">Certificats du coach</p>
        {certificates.length === 0 ? (
          <p className="text-xs text-subtle">Aucun certificat.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {certificates.map((c) => (
              <li key={c.id.toString()} className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                <CertStatusBadge status={c.status} />
                <span className="min-w-0 flex-1 truncate text-white">{c.title}</span>
                <ButtonLink href={`/verifier/${c.id.toString()}`} variant="ghost" size="sm">
                  n°{c.id.toString()}
                </ButtonLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

export function GymApplications({ gymId }: { gymId: bigint }) {
  const { data, loading, error, reload } = useContractData(
    async (provider) => {
      const ids = toIds(await getContract("GymManager", provider).getApplicationsOfGym(gymId));
      const applications = (await readApplications(provider, ids)).reverse();
      const coaches = [...new Set(applications.map((a) => a.coach.toLowerCase()))];
      const certsByCoach = new Map(
        await Promise.all(coaches.map(async (c) => [c, await readCertificatesOf(provider, c)] as const))
      );
      const trainingIds = [...new Set([...certsByCoach.values()].flat().map((r) => r.certificate.trainingId.toString()))].map(BigInt);
      const titles = Object.fromEntries((await readTrainings(provider, trainingIds)).map((t) => [t.id.toString(), t.title]));
      return applications.map((a) => ({
        application: a,
        certificates: (certsByCoach.get(a.coach.toLowerCase()) ?? []).map((r) => ({
          id: r.id,
          status: r.status,
          title: titles[r.certificate.trainingId.toString()] ?? `Formation n°${r.certificate.trainingId.toString()}`,
        })),
      }));
    },
    ["gym-applications", gymId],
    { requires: GYM_CONTRACTS }
  );

  if (loading) return <SkeletonList count={2} />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data || data.length === 0) {
    return (
      <Card>
        <EmptyState icon={Send} title="Aucune candidature" description="Les coachs certifiés peuvent postuler depuis leur espace coach." />
      </Card>
    );
  }
  const sorted = [...data].sort(
    (a, b) => Number(b.application.status === ApplicationStatus.Pending) - Number(a.application.status === ApplicationStatus.Pending)
  );
  return (
    <div className="flex flex-col gap-3">
      {sorted.map((d) => (
        <ApplicationCard key={d.application.id.toString()} application={d.application} certificates={d.certificates} />
      ))}
    </div>
  );
}
