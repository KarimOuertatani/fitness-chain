"use client";

import { useState } from "react";
import { Building2, Coins, ExternalLink, Pencil, Plus, Send, UserRound, Users } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useContractData } from "@/hooks/useContractData";
import { useMetadata } from "@/hooks/useMetadata";
import { getContract, GYM_CONTRACTS } from "@/lib/contracts";
import { toIds } from "@/lib/mappers";
import { readGymCoaches, readGyms } from "@/lib/reads";
import { formatFTC } from "@/lib/format";
import type { Gym } from "@/types";
import { ErrorState } from "@/components/shared/ErrorState";
import { IpfsImage } from "@/components/shared/IpfsImage";
import { NotDeployedState } from "@/components/shared/NotDeployedState";
import { RequireWallet } from "@/components/wallet/RequireWallet";
import { Badge, Button, ButtonLink, Card, Modal, PageHeader, SectionTitle, Skeleton, StatCard, TabPanel, Tabs } from "@/components/ui";
import { RegisterGymForm } from "@/components/salle/RegisterGymForm";
import { EditGymModal } from "@/components/salle/EditGymModal";
import { GymApplications } from "@/components/salle/GymApplications";
import { GymTeam } from "@/components/salle/GymTeam";
import { GymSubscribers } from "@/components/salle/GymSubscribers";

type TabKey = "candidatures" | "equipe" | "abonnes";

function GymDashboard({ gym }: { gym: Gym }) {
  const [tab, setTab] = useState<TabKey>("candidatures");
  const [editing, setEditing] = useState(false);
  const { metadata } = useMetadata(gym.metadataURI);
  const { data: coaches, loading } = useContractData((p) => readGymCoaches(p, gym.id), ["gym-coaches", gym.id], {
    requires: GYM_CONTRACTS,
  });

  return (
    <div className="flex flex-col gap-6">
      <Card padding="none" className="overflow-hidden">
        <IpfsImage uri={metadata?.image} alt={gym.name} className="h-40 sm:h-52" fallbackIcon={Building2} />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-2xl font-extrabold text-white">{gym.name}</h2>
              <Badge tone={gym.active ? "green" : "gray"}>{gym.active ? "Active" : "Inactive"}</Badge>
            </div>
            {metadata?.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{metadata.description}</p>}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <ButtonLink href={`/salles/${gym.id.toString()}`} variant="glass" size="sm" icon={ExternalLink}>
              Page publique
            </ButtonLink>
            <Button size="sm" icon={Pencil} onClick={() => setEditing(true)}>
              Modifier les tarifs
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard icon={Coins} tone="gold" label="Abonnement mensuel" value={<span className="text-gold">{formatFTC(gym.monthlyFee)}</span>} />
        <StatCard icon={Send} tone="violet" label="Frais d'affiliation" teal value={formatFTC(gym.affiliationFee)} />
        <StatCard icon={Users} tone="cyan" label="Coachs" loading={loading} value={coaches?.length ?? "—"} className="col-span-2 lg:col-span-1" />
      </div>

      <div>
        <Tabs<TabKey>
          label="Gestion de la salle"
          active={tab}
          onChange={setTab}
          tabs={[
            { key: "candidatures", label: "Candidatures", icon: Send },
            { key: "equipe", label: "Équipe", icon: Users, count: coaches?.length },
            { key: "abonnes", label: "Abonnés", icon: UserRound },
          ]}
        />
        <TabPanel>
          {tab === "candidatures" && <GymApplications gymId={gym.id} />}
          {tab === "equipe" && (coaches ? <GymTeam gymId={gym.id} coaches={coaches} /> : <Skeleton className="h-32 rounded-3xl" />)}
          {tab === "abonnes" && <GymSubscribers gymId={gym.id} />}
        </TabPanel>
      </div>

      {editing && <EditGymModal gym={gym} onClose={() => setEditing(false)} />}
    </div>
  );
}

function SalleContent() {
  const { address, isAvailable } = useWallet();
  const deployed = isAvailable(GYM_CONTRACTS);
  const [selected, setSelected] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);

  const { data: gyms, loading, error, reload } = useContractData(
    async (provider) => readGyms(provider, toIds(await getContract("GymManager", provider).getGymsOf(address))),
    ["my-gyms", address],
    { enabled: !!address, requires: GYM_CONTRACTS }
  );

  if (!deployed) return <NotDeployedState what="votre salle" />;
  if (loading) return <Skeleton className="h-72 rounded-3xl" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  if (!gyms || gyms.length === 0) {
    return (
      <Card className="mx-auto max-w-2xl">
        <SectionTitle>Inscrire ma salle</SectionTitle>
        <p className="mt-2 mb-5 text-sm text-muted">
          Fixez votre abonnement mensuel et les frais d&apos;affiliation demandés aux coachs. Tous les paiements se font en FTC.
        </p>
        <RegisterGymForm />
      </Card>
    );
  }

  const current = gyms.find((g) => g.id.toString() === selected) ?? gyms[0];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        {gyms.length > 1 &&
          gyms.map((g) => (
            <button
              key={g.id.toString()}
              type="button"
              onClick={() => setSelected(g.id.toString())}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                g.id === current.id ? "border-primary-light/50 bg-primary/20 text-primary-light" : "border-border text-muted hover:text-white"
              }`}
            >
              {g.name}
            </button>
          ))}
        <Button variant="glass" size="sm" icon={Plus} onClick={() => setRegistering(true)} className="ml-auto">
          Inscrire une autre salle
        </Button>
      </div>
      <GymDashboard key={current.id.toString()} gym={current} />
      <Modal open={registering} onClose={() => setRegistering(false)} title="Inscrire une autre salle" size="lg">
        <RegisterGymForm onDone={() => setRegistering(false)} />
      </Modal>
    </div>
  );
}

export function SalleView() {
  return (
    <>
      <PageHeader title="Ma salle" subtitle="Gérez vos tarifs, recrutez des coachs certifiés et suivez vos abonnés." />
      <RequireWallet message="Connectez le wallet du propriétaire de la salle.">
        <SalleContent />
      </RequireWallet>
    </>
  );
}
