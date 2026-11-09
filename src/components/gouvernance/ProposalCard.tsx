"use client";

import { Clock, Play, ThumbsDown, ThumbsUp, UserMinus, UserPlus } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useTx } from "@/hooks/useTx";
import { getContract } from "@/lib/contracts";
import { formatDuration } from "@/lib/format";
import { sameAddress } from "@/lib/mappers";
import { ProposalStatus, ProposalType } from "@/types";
import { AddressText } from "@/components/shared/AddressText";
import { ProposalStatusBadge } from "@/components/shared/StatusBadges";
import { Badge, Button, Card, IconTile, ProgressBar } from "@/components/ui";
import type { ProposalEntry } from "@/components/gouvernance/useGovernance";

export function ProposalCard({
  proposal,
  isMember,
  nowMs,
  centerName,
}: {
  proposal: ProposalEntry;
  isMember: boolean;
  nowMs: number;
  centerName?: string;
}) {
  const { address, canWrite } = useWallet();
  const { run, pending } = useTx();

  const isAdd = proposal.pType === ProposalType.Add;
  const eligible = Math.max(proposal.eligible, 0);
  const needed = Math.floor(eligible / 2) + 1;
  const yes = Number(proposal.yesVotes);
  const no = Number(proposal.noVotes);
  const remainingMs = Number(proposal.deadline) * 1000 - nowMs;
  const open = nowMs > 0 && remainingMs > 0;
  const isTarget = !isAdd && sameAddress(proposal.candidate, address);

  const canVote =
    isMember && canWrite && proposal.status === ProposalStatus.Pending && open && !proposal.hasVoted && !isTarget;
  const canExecute = canWrite && proposal.status === ProposalStatus.Approved;

  const vote = (support: boolean) =>
    run((signer) => getContract("CenterDAO", signer).vote(proposal.id, support), {
      success: support ? "Vote « oui » enregistré." : "Vote « non » enregistré.",
    });

  const execute = () =>
    run((signer) => getContract("CenterDAO", signer).execute(proposal.id), {
      success: isAdd ? "Proposition exécutée : le centre est agréé." : "Proposition exécutée : le centre est exclu.",
    });

  const title = isAdd ? proposal.name || centerName || "Nouveau centre" : centerName || "Centre";

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <IconTile icon={isAdd ? UserPlus : UserMinus} tone={isAdd ? "cyan" : "red"} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={isAdd ? "violet" : "orange"}>{isAdd ? "Ajout" : "Exclusion"}</Badge>
            <span className="text-xs text-subtle">Proposition n°{proposal.id.toString()}</span>
          </div>
          <p className="mt-2 truncate text-base font-bold text-white">{title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
            <span className="flex items-center gap-1">
              Candidat : <AddressText address={proposal.candidate} />
            </span>
            <span className="flex items-center gap-1">
              Proposé par : <AddressText address={proposal.proposer} />
            </span>
          </div>
        </div>
        <ProposalStatusBadge status={proposal.status} />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-muted">
          <span>
            <span className="font-semibold text-success">{yes} oui</span> · <span className="font-semibold text-danger">{no} non</span>
          </span>
          <span>
            Majorité : {needed} / {eligible}
          </span>
        </div>
        <ProgressBar value={yes} max={eligible || 1} marker={needed} label="Votes favorables" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-muted">
          <Clock className="size-4" aria-hidden />
          {proposal.executed
            ? "Terminée"
            : nowMs === 0
              ? "…"
              : open
                ? `Reste ${formatDuration(remainingMs)}`
                : "Vote clôturé"}
          {proposal.hasVoted && <Badge tone="gray">Vous avez voté</Badge>}
          {isTarget && <Badge tone="orange">Vous êtes visé</Badge>}
        </p>
        <div className="flex flex-wrap gap-2">
          {canVote && (
            <>
              <Button variant="success" size="sm" icon={ThumbsUp} loading={pending} onClick={() => void vote(true)}>
                Voter oui
              </Button>
              <Button variant="danger" size="sm" icon={ThumbsDown} disabled={pending} onClick={() => void vote(false)}>
                Voter non
              </Button>
            </>
          )}
          {canExecute && (
            <Button size="sm" icon={Play} loading={pending} onClick={() => void execute()}>
              Exécuter
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
