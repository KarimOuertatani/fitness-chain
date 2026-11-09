"use client";

import { useState } from "react";
import { formatUnits } from "ethers";
import { Building2, Coins, DoorOpen, Dumbbell, Pencil, Send, Undo2 } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useTx } from "@/hooks/useTx";
import { useContractData } from "@/hooks/useContractData";
import { getContract } from "@/lib/contracts";
import { sameAddress, toIds } from "@/lib/mappers";
import { readAllGyms, readApplications, readGymCoaches } from "@/lib/reads";
import { formatDate, formatFTC, tryParseFTC } from "@/lib/format";
import { ApplicationStatus, type Gym } from "@/types";
import { ErrorState } from "@/components/shared/ErrorState";
import { NotDeployedState } from "@/components/shared/NotDeployedState";
import { ApplicationStatusBadge } from "@/components/shared/StatusBadges";
import { PaymentModal } from "@/components/wallet/PaymentModal";
import { Alert, Button, ButtonLink, Card, EmptyState, Input, Modal, SectionTitle, Select, SkeletonList } from "@/components/ui";

interface WorkEntry {
  gym: Gym;
  price: bigint;
}

function PriceModal({ entry, onClose }: { entry: WorkEntry; onClose: () => void }) {
  const { canWrite } = useWallet();
  const { run, pending } = useTx();
  const [price, setPrice] = useState(formatUnits(entry.price, 18).replace(/\.0$/, ""));
  const value = tryParseFTC(price);

  const submit = async () => {
    if (value === null) return;
    const receipt = await run((signer) => getContract("GymManager", signer).setCoachingPrice(entry.gym.id, value), {
      success: "Prix de coaching mis à jour.",
    });
    if (receipt) onClose();
  };

  return (
    <Modal
      open
      onClose={() => !pending && onClose()}
      dismissible={!pending}
      title={`Mon prix chez ${entry.gym.name}`}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button loading={pending} disabled={!canWrite || value === null} onClick={() => void submit()}>
            Enregistrer
          </Button>
        </div>
      }
    >
      <Input label="Prix du coaching privé (par mois)" inputMode="decimal" icon={Coins} suffix="FTC" value={price} onChange={(e) => setPrice(e.target.value)} error={price && value === null ? "Prix invalide." : null} />
    </Modal>
  );
}

export function MyGymsTab() {
  const { address, canWrite, isAvailable } = useWallet();
  const { run, pending } = useTx();
  const [gymId, setGymId] = useState("");
  const [priceInput, setPriceInput] = useState("20");
  const [paying, setPaying] = useState(false);
  const [editing, setEditing] = useState<WorkEntry | null>(null);

  const { data, loading, error, reload } = useContractData(
    async (provider) => {
      const gymManager = getContract("GymManager", provider);
      const certificate = getContract("CoachCertificate", provider);
      const [gyms, appIds, workIds, certified] = await Promise.all([
        readAllGyms(provider),
        gymManager.getApplicationsOfCoach(address).then(toIds),
        gymManager.getCoachGyms(address).then(toIds),
        certificate.hasValidCertificate(address) as Promise<boolean>,
      ]);
      const applications = (await readApplications(provider, appIds)).reverse();
      const gymById = new Map(gyms.map((g) => [g.id.toString(), g]));
      const work: WorkEntry[] = await Promise.all(
        workIds.map(async (id) => {
          const coaches = await readGymCoaches(provider, id);
          const me = coaches.find((c) => sameAddress(c.coach, address));
          return { gym: gymById.get(id.toString()) as Gym, price: me?.price ?? 0n };
        })
      );
      const workSet = new Set(workIds.map(String));
      const pendingSet = new Set(applications.filter((a) => a.status === ApplicationStatus.Pending).map((a) => a.gymId.toString()));
      const available = gyms.filter((g) => g.active && !workSet.has(g.id.toString()) && !pendingSet.has(g.id.toString()));
      return { gymById, applications, work: work.filter((w) => !!w.gym), available, certified: Boolean(certified) };
    },
    ["coach-gyms", address],
    { enabled: !!address }
  );

  if (!isAvailable()) return <NotDeployedState what="les salles (GymManager)" />;
  if (loading) return <SkeletonList count={3} />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const selectedGym = data.available.find((g) => g.id.toString() === gymId);
  const coachingPrice = tryParseFTC(priceInput);

  const cancel = (id: bigint, amount: bigint) =>
    run((signer) => getContract("GymManager", signer).cancelApplication(id), {
      success: `Candidature annulée : ${formatFTC(amount)} remboursés.`,
    });
  const leave = (gym: Gym) =>
    run((signer) => getContract("GymManager", signer).removeCoach(gym.id, address), {
      success: `Vous avez quitté ${gym.name}.`,
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <Card className="h-fit">
        <SectionTitle>Postuler dans une salle</SectionTitle>
        {!data.certified ? (
          <Alert tone="warning" title="Certificat valide requis" className="mt-4">
            Seuls les coachs titulaires d&apos;un certificat valide peuvent postuler. Suivez une formation dans le catalogue.
          </Alert>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            <Select label="Salle" icon={Building2} value={gymId} onChange={(e) => setGymId(e.target.value)}>
              <option value="">Choisir une salle…</option>
              {data.available.map((g) => (
                <option key={g.id.toString()} value={g.id.toString()}>
                  {g.name} — affiliation {formatFTC(g.affiliationFee)}
                </option>
              ))}
            </Select>
            <Input
              label="Mon prix de coaching privé (par mois)"
              inputMode="decimal"
              icon={Coins}
              suffix="FTC"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              error={priceInput && coachingPrice === null ? "Prix invalide." : null}
            />
            {selectedGym && (
              <p className="text-sm text-muted">
                Frais d&apos;affiliation placés en séquestre : <span className="font-semibold text-gold">{formatFTC(selectedGym.affiliationFee)}</span>{" "}
                (remboursés si la salle refuse).
              </p>
            )}
            <Button icon={Send} disabled={!canWrite || !selectedGym || coachingPrice === null} onClick={() => setPaying(true)} fullWidth>
              Postuler
            </Button>
          </div>
        )}
      </Card>

      <div className="flex min-w-0 flex-col gap-6">
        <section className="flex flex-col gap-3">
          <SectionTitle tone="cyan">Salles où je travaille</SectionTitle>
          {data.work.length === 0 ? (
            <Card>
              <EmptyState icon={Dumbbell} title="Aucune salle pour le moment" description="Postulez dans une salle : vous y apparaîtrez dès que le propriétaire aura accepté." />
            </Card>
          ) : (
            data.work.map((w) => (
              <Card key={w.gym.id.toString()} padding="sm" className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{w.gym.name}</p>
                  <p className="text-xs text-subtle">
                    Mon coaching : <span className="font-semibold text-gold">{formatFTC(w.price)}</span> / mois
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <ButtonLink href={`/salles/${w.gym.id.toString()}`} variant="glass" size="sm">
                    Voir
                  </ButtonLink>
                  <Button variant="glass" size="sm" icon={Pencil} disabled={!canWrite} onClick={() => setEditing(w)}>
                    Mon prix
                  </Button>
                  <Button variant="danger" size="sm" icon={DoorOpen} disabled={!canWrite || pending} onClick={() => void leave(w.gym)}>
                    Quitter
                  </Button>
                </div>
              </Card>
            ))
          )}
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle>Mes candidatures</SectionTitle>
          {data.applications.length === 0 ? (
            <Card>
              <EmptyState icon={Send} title="Aucune candidature" />
            </Card>
          ) : (
            data.applications.map((a) => (
              <Card key={a.id.toString()} padding="sm" className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-white">{data.gymById.get(a.gymId.toString())?.name ?? `Salle n°${a.gymId.toString()}`}</p>
                    <ApplicationStatusBadge status={a.status} />
                  </div>
                  <p className="mt-1 text-xs text-subtle">
                    {formatDate(a.createdAt)} · prix proposé {formatFTC(a.coachingPrice)} / mois · affiliation {formatFTC(a.amount)}
                  </p>
                </div>
                {a.status === ApplicationStatus.Pending && (
                  <Button variant="danger" size="sm" icon={Undo2} disabled={!canWrite || pending} onClick={() => void cancel(a.id, a.amount)}>
                    Annuler
                  </Button>
                )}
              </Card>
            ))
          )}
        </section>
      </div>

      {paying && selectedGym && coachingPrice !== null && (
        <PaymentModal
          open
          onClose={() => setPaying(false)}
          title={`Postuler chez ${selectedGym.name}`}
          description="Les frais d'affiliation sont versés au propriétaire si votre candidature est acceptée, et remboursés sinon."
          amount={selectedGym.affiliationFee}
          spender="GymManager"
          lines={[{ label: "Prix de coaching proposé", value: `${formatFTC(coachingPrice)} / mois` }]}
          payLabel="Payer"
          successMessage="Candidature envoyée."
          onPay={(signer) => getContract("GymManager", signer).applyToGym(selectedGym.id, coachingPrice)}
          onSuccess={() => setGymId("")}
        />
      )}
      {editing && <PriceModal entry={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
