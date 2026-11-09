"use client";

import { useState } from "react";
import { Award, ExternalLink, ShieldOff } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useTx } from "@/hooks/useTx";
import { useContractData } from "@/hooks/useContractData";
import { getContract } from "@/lib/contracts";
import { sameAddress } from "@/lib/mappers";
import { readAllCertificates, readTrainings } from "@/lib/reads";
import { formatDate } from "@/lib/format";
import type { Certificate } from "@/types";
import { AddressText } from "@/components/shared/AddressText";
import { ErrorState } from "@/components/shared/ErrorState";
import { CertStatusBadge } from "@/components/shared/StatusBadges";
import { Button, ButtonLink, Card, EmptyState, Modal, SkeletonList, Textarea } from "@/components/ui";

function RevokeModal({ certificate, onClose }: { certificate: Certificate; onClose: () => void }) {
  const { canWrite } = useWallet();
  const { run, pending } = useTx();
  const [reason, setReason] = useState("");

  const submit = async () => {
    const receipt = await run(
      (signer) => getContract("CoachCertificate", signer).revokeCertificate(certificate.id, reason.trim()),
      { success: "Certificat révoqué." }
    );
    if (receipt) onClose();
  };

  return (
    <Modal
      open
      onClose={() => !pending && onClose()}
      dismissible={!pending}
      title={`Révoquer le certificat n°${certificate.id.toString()}`}
      description="La révocation est définitive et visible publiquement sur la page Vérifier."
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button variant="danger" icon={ShieldOff} loading={pending} disabled={!canWrite || reason.trim().length === 0} onClick={() => void submit()}>
            Révoquer
          </Button>
        </div>
      }
    >
      <Textarea label="Motif de la révocation" placeholder="Ex. fraude constatée lors de l'évaluation" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={280} />
    </Modal>
  );
}

export function IssuedCertificatesTab() {
  const { address, canWrite } = useWallet();
  const [revoking, setRevoking] = useState<Certificate | null>(null);

  const { data, loading, error, reload } = useContractData(
    async (provider) => {
      const all = await readAllCertificates(provider);
      const mine = all.filter((r) => sameAddress(r.certificate.issuer, address)).reverse();
      const trainingIds = [...new Set(mine.map((r) => r.certificate.trainingId.toString()))].map(BigInt);
      const trainings = await readTrainings(provider, trainingIds);
      const titles = Object.fromEntries(trainings.map((t) => [t.id.toString(), t.title]));
      return { items: mine, titles };
    },
    ["center-certificates", address],
    { enabled: !!address }
  );

  if (loading) return <SkeletonList count={3} />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data || data.items.length === 0) {
    return (
      <Card>
        <EmptyState icon={Award} title="Aucun certificat émis" description="Les certificats délivrés après validation des formations apparaîtront ici." />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {data.items.map(({ status, certificate: c }) => (
        <Card key={c.id.toString()} padding="sm" className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold text-white">
                n°{c.id.toString()} · {data.titles[c.trainingId.toString()] ?? `Formation n°${c.trainingId.toString()}`}
              </p>
              <CertStatusBadge status={status} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
              <span className="flex items-center gap-1">
                Coach : <AddressText address={c.coach} />
              </span>
              <span>Délivré le {formatDate(c.issuedAt)}</span>
              <span>{c.expiresAt === 0 ? "Sans expiration" : `Expire le ${formatDate(c.expiresAt)}`}</span>
            </div>
            {c.revoked && c.revokeReason && <p className="mt-1 text-xs text-danger">Motif : {c.revokeReason}</p>}
          </div>
          <div className="flex shrink-0 gap-2">
            <ButtonLink href={`/verifier/${c.id.toString()}`} variant="glass" size="sm" icon={ExternalLink}>
              Vérifier
            </ButtonLink>
            {!c.revoked && (
              <Button variant="danger" size="sm" icon={ShieldOff} disabled={!canWrite} onClick={() => setRevoking(c)}>
                Révoquer
              </Button>
            )}
          </div>
        </Card>
      ))}
      {revoking && <RevokeModal certificate={revoking} onClose={() => setRevoking(null)} />}
    </div>
  );
}
