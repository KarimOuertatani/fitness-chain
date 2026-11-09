"use client";

import { useWallet } from "@/hooks/useWallet";
import { useContractData } from "@/hooks/useContractData";
import { getContract } from "@/lib/contracts";
import { toCenter, toProposal } from "@/lib/mappers";
import { ProposalType, type Center, type Proposal, type ProposalStatus } from "@/types";

export interface CenterEntry extends Center {
  address: string;
}

export interface ProposalEntry extends Proposal {
  id: bigint;
  status: ProposalStatus;
  hasVoted: boolean;
  /** Votants éligibles (memberCount, − 1 pour l'exclusion d'un centre actif) */
  eligible: number;
}

export interface GovernanceData {
  centers: CenterEntry[];
  proposals: ProposalEntry[];
  memberCount: number;
  votingPeriod: bigint;
  isMember: boolean;
}

export function useGovernance() {
  const { address } = useWallet();
  return useContractData(
    async (provider): Promise<GovernanceData> => {
      const dao = getContract("CenterDAO", provider);
      const [addresses, memberCountRaw, votingPeriod, countRaw, isMember] = await Promise.all([
        dao.getCenters() as Promise<string[]>,
        dao.memberCount(),
        dao.votingPeriod(),
        dao.proposalCount(),
        address ? (dao.isActiveCenter(address) as Promise<boolean>) : Promise.resolve(false),
      ]);
      const memberCount = Number(memberCountRaw);

      const centers: CenterEntry[] = await Promise.all(
        [...addresses].map(async (a) => ({ address: String(a), ...toCenter(await dao.centers(a)) }))
      );
      const activeByAddress = new Map(centers.map((c) => [c.address.toLowerCase(), c.active]));

      // Les propositions sont indexées à partir de 0
      const count = Number(countRaw);
      const proposals: ProposalEntry[] = await Promise.all(
        Array.from({ length: count }, async (_, i) => {
          const id = BigInt(i);
          const [raw, status, voted] = await Promise.all([
            dao.getProposal(id),
            dao.proposalStatus(id),
            address ? (dao.hasVoted(id, address) as Promise<boolean>) : Promise.resolve(false),
          ]);
          const proposal = toProposal(raw);
          const targetActive = activeByAddress.get(proposal.candidate.toLowerCase()) ?? false;
          const eligible = memberCount - (proposal.pType === ProposalType.Remove && targetActive ? 1 : 0);
          return { ...proposal, id, status: Number(status) as ProposalStatus, hasVoted: Boolean(voted), eligible };
        })
      );

      return {
        centers,
        proposals: proposals.reverse(),
        memberCount,
        votingPeriod: BigInt(votingPeriod),
        isMember: Boolean(isMember),
      };
    },
    ["governance", address]
  );
}
