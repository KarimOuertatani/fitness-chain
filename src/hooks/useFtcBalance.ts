"use client";

import { getContract } from "@/lib/contracts";
import { useWallet } from "@/hooks/useWallet";
import { useContractData } from "@/hooks/useContractData";

/** Solde FTC d'une adresse (par défaut : le compte connecté). */
export function useFtcBalance(account?: string | null) {
  const { address } = useWallet();
  const target = account ?? address;
  const { data, loading, error, reload } = useContractData(
    async (provider) => BigInt(await getContract("FitCoin", provider).balanceOf(target)),
    ["ftc-balance", target],
    { enabled: !!target, requires: ["FitCoin"] }
  );
  return { balance: data, loading, error, reload };
}
