"use client";

import { Vote } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useNow } from "@/hooks/useNow";
import { formatDuration } from "@/lib/format";
import { Alert, Card, EmptyState, PageHeader, SectionTitle, SkeletonList } from "@/components/ui";
import { ErrorState } from "@/components/shared/ErrorState";
import { NotDeployedState } from "@/components/shared/NotDeployedState";
import { CentersList } from "@/components/gouvernance/CentersList";
import { ProposalCard } from "@/components/gouvernance/ProposalCard";
import { ProposeAddForm, ProposeRemoveForm } from "@/components/gouvernance/ProposeForms";
import { useGovernance } from "@/components/gouvernance/useGovernance";

export function GovernanceView() {
  const { isAvailable, address } = useWallet();
  const deployed = isAvailable(["CenterDAO"]);
  const now = useNow();
  const { data, loading, error, reload } = useGovernance();
  const names = new Map(data?.centers.map((c) => [c.address.toLowerCase(), c.name]) ?? []);

  return (
    <>
      <PageHeader
        title="Gouvernance"
        subtitle="Les centres agréés décident ensemble, par vote majoritaire, de l'entrée et de l'exclusion des centres. Aucun administrateur."
      />
      {!deployed ? (
        <NotDeployedState what="la gouvernance" />
      ) : loading ? (
        <SkeletonList count={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : data ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="flex min-w-0 flex-col gap-4">
            <SectionTitle
              action={<span className="text-xs text-subtle">Période de vote : {formatDuration(Number(data.votingPeriod) * 1000)}</span>}
            >
              Propositions
            </SectionTitle>
            {data.proposals.length === 0 ? (
              <Card>
                <EmptyState icon={Vote} title="Aucune proposition" description="Les propositions d'ajout et d'exclusion de centres apparaîtront ici." />
              </Card>
            ) : (
              data.proposals.map((p) => (
                <ProposalCard
                  key={p.id.toString()}
                  proposal={p}
                  isMember={data.isMember}
                  nowMs={now}
                  centerName={names.get(p.candidate.toLowerCase())}
                />
              ))
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-6">
            <CentersList centers={data.centers} memberCount={data.memberCount} />
            {data.isMember ? (
              <>
                <ProposeAddForm centers={data.centers} />
                <ProposeRemoveForm centers={data.centers} memberCount={data.memberCount} />
              </>
            ) : (
              <Alert tone="info" title="Réservé aux centres membres">
                {address
                  ? "Seuls les centres agréés peuvent proposer et voter. Tout le monde peut exécuter une proposition approuvée."
                  : "Connectez votre wallet pour participer."}
              </Alert>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
