"use client";

import type { Provider } from "ethers";
import { useWallet } from "@/hooks/useWallet";
import { useAsync, type AsyncState } from "@/hooks/useAsync";

/**
 * Lecture on-chain via le provider de lecture (aucun wallet requis).
 * Désactivée si les contrats ne sont pas déployés ; rafraîchie après chaque transaction.
 */
export function useContractData<T>(
  fetcher: (provider: Provider) => Promise<T>,
  key: readonly unknown[],
  options: { enabled?: boolean } = {}
): AsyncState<T> {
  const { readProvider, deployed, refreshKey } = useWallet();
  const enabled = (options.enabled ?? true) && deployed && readProvider !== null;
  return useAsync(() => fetcher(readProvider as Provider), key, { enabled, refreshKey });
}
