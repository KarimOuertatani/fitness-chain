"use client";

import { useWallet } from "@/hooks/useWallet";
import { useContractData } from "@/hooks/useContractData";
import { getContract } from "@/lib/contracts";
import { toCenter } from "@/lib/mappers";

/** Statut DAO de l'adresse connectée. */
export function useCenterStatus() {
  const { address } = useWallet();
  return useContractData(
    async (provider) => {
      const dao = getContract("CenterDAO", provider);
      const [active, center] = await Promise.all([dao.isActiveCenter(address), dao.centers(address)]);
      return { active: Boolean(active), center: toCenter(center) };
    },
    ["center-status", address],
    { enabled: !!address }
  );
}
