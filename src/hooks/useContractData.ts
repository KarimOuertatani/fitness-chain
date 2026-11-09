"use client";

import type { Provider } from "ethers";
import type { ContractName } from "@/lib/contracts";
import { useWallet } from "@/hooks/useWallet";
import { useAsync, type AsyncState } from "@/hooks/useAsync";

/**
 * Lecture on-chain via le provider de lecture (aucun wallet requis).
 * Désactivée si les contrats requis (`requires`, par défaut les 5) ne sont pas déployés ;
 * rafraîchie après chaque transaction.
 */
export function useContractData<T>(
  fetcher: (provider: Provider) => Promise<T>,
  key: readonly unknown[],
  options: { enabled?: boolean; requires?: readonly ContractName[] } = {}
): AsyncState<T> {
  const { readProvider, isAvailable, refreshKey } = useWallet();
  const enabled = (options.enabled ?? true) && isAvailable(options.requires) && readProvider !== null;
  return useAsync(() => fetcher(readProvider as Provider), key, { enabled, refreshKey });
}
