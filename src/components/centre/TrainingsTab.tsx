"use client";

import { useState } from "react";
import { BookOpen, CalendarClock, Pencil, Plus, Power, ShieldCheck } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useTx } from "@/hooks/useTx";
import { useContractData } from "@/hooks/useContractData";
import { useMetadata } from "@/hooks/useMetadata";
import { getContract, CERTIFICATE_CONTRACTS } from "@/lib/contracts";
import { toIds } from "@/lib/mappers";
import { readTrainings } from "@/lib/reads";
import { formatFTC, pluralDays } from "@/lib/format";
import type { Training } from "@/types";
import { ErrorState } from "@/components/shared/ErrorState";
import { IpfsImage } from "@/components/shared/IpfsImage";
import { Badge, Button, Card, EmptyState, SkeletonList, FtcGlyph } from "@/components/ui";
import { TrainingFormModal } from "@/components/centre/TrainingFormModal";

function TrainingCard({ training, onEdit }: { training: Training; onEdit: () => void }) {
  const { canWrite } = useWallet();
  const { run, pending } = useTx();
  const { metadata } = useMetadata(training.metadataURI);

  const toggle = () =>
    run(
      (signer) =>
        getContract("CoachCertificate", signer).updateTraining(training.id, training.price, training.metadataURI, !training.active),
      { success: training.active ? "Formation désactivée." : "Formation activée." }
    );

  return (
    <Card padding="none" className="flex flex-col overflow-hidden">
      <IpfsImage uri={metadata?.image} alt={training.title} className="h-32" fallbackIcon={BookOpen} />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 text-base font-bold text-white">{training.title}</p>
          <Badge tone={training.active ? "green" : "gray"}>{training.active ? "Active" : "Inactive"}</Badge>
        </div>
        {metadata?.description && <p className="line-clamp-2 text-sm text-muted">{metadata.description}</p>}
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge tone="gold" icon={FtcGlyph}>
            {formatFTC(training.price)}
          </Badge>
          <Badge tone="violet" icon={CalendarClock}>
            {pluralDays(training.durationDays)}
          </Badge>
          <Badge tone="cyan" icon={ShieldCheck}>
            {training.validityDays === 0 ? "Sans expiration" : `Valide ${pluralDays(training.validityDays)}`}
          </Badge>
        </div>
        <div className="mt-auto flex gap-2 pt-2">
          <Button variant="glass" size="sm" icon={Pencil} onClick={onEdit} disabled={!canWrite}>
            Modifier
          </Button>
          <Button variant={training.active ? "danger" : "success"} size="sm" icon={Power} loading={pending} disabled={!canWrite} onClick={() => void toggle()}>
            {training.active ? "Désactiver" : "Activer"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function TrainingsTab() {
  const { address, canWrite } = useWallet();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Training | null>(null);

  const { data, loading, error, reload } = useContractData(
    async (provider) => {
      const ids = toIds(await getContract("CoachCertificate", provider).getTrainingsOf(address));
      return (await readTrainings(provider, ids)).reverse();
    },
    ["center-trainings", address],
    { enabled: !!address, requires: CERTIFICATE_CONTRACTS }
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <Button icon={Plus} onClick={() => setCreating(true)} disabled={!canWrite}>
          Nouvelle formation
        </Button>
      </div>
      {loading ? (
        <SkeletonList count={2} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data || data.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title="Aucune formation"
            description="Créez votre première formation pour la proposer aux coachs."
            action={
              <Button icon={Plus} size="sm" onClick={() => setCreating(true)} disabled={!canWrite}>
                Créer une formation
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((t) => (
            <TrainingCard key={t.id.toString()} training={t} onEdit={() => setEditing(t)} />
          ))}
        </div>
      )}

      {creating && <TrainingFormModal open onClose={() => setCreating(false)} />}
      {editing && <TrainingFormModal key={editing.id.toString()} open training={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
