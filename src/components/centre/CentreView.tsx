"use client";

import { CERTIFICATE_CONTRACTS } from "@/lib/contracts";
import { useState } from "react";
import { Award, BookOpen, Inbox, Landmark, Vote } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { ButtonLink, Card, EmptyState, PageHeader, Skeleton, TabPanel, Tabs } from "@/components/ui";
import { ErrorState } from "@/components/shared/ErrorState";
import { NotDeployedState } from "@/components/shared/NotDeployedState";
import { RequireWallet } from "@/components/wallet/RequireWallet";
import { useCenterStatus } from "@/components/centre/useCenterStatus";
import { TrainingsTab } from "@/components/centre/TrainingsTab";
import { RequestsTab } from "@/components/centre/RequestsTab";
import { IssuedCertificatesTab } from "@/components/centre/IssuedCertificatesTab";

type TabKey = "formations" | "demandes" | "certificats";

function CentreContent() {
  const { isAvailable } = useWallet();
  const deployed = isAvailable(CERTIFICATE_CONTRACTS);
  const { data, loading, error, reload } = useCenterStatus();
  const [tab, setTab] = useState<TabKey>("formations");

  if (!deployed) return <NotDeployedState what="votre espace centre" />;
  if (loading) return <Skeleton className="h-64 rounded-3xl" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data?.active) {
    return (
      <Card>
        <EmptyState
          icon={Landmark}
          title={data?.center.name ? `${data.center.name} n'est plus un centre actif` : "Vous n'êtes pas un centre agréé"}
          description="Pour publier des formations et certifier des coachs, votre centre doit être accepté par la DAO des centres : un membre propose votre adresse, puis la majorité vote pour."
          action={
            <ButtonLink href="/gouvernance" icon={Vote}>
              Aller à la gouvernance
            </ButtonLink>
          }
        />
      </Card>
    );
  }

  return (
    <>
      <p className="mb-4 text-sm text-muted">
        Connecté en tant que <span className="font-semibold text-white">{data.center.name}</span>
      </p>
      <Tabs<TabKey>
        label="Espace centre"
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "formations", label: "Mes formations", icon: BookOpen },
          { key: "demandes", label: "Demandes reçues", icon: Inbox },
          { key: "certificats", label: "Certificats émis", icon: Award },
        ]}
      />
      <TabPanel>
        {tab === "formations" && <TrainingsTab />}
        {tab === "demandes" && <RequestsTab centerName={data.center.name} />}
        {tab === "certificats" && <IssuedCertificatesTab />}
      </TabPanel>
    </>
  );
}

export function CentreView() {
  return (
    <>
      <PageHeader title="Espace centre" subtitle="Publiez vos formations, gérez les demandes des coachs et délivrez des certificats Soulbound." />
      <RequireWallet message="Connectez le wallet de votre centre.">
        <CentreContent />
      </RequireWallet>
    </>
  );
}
