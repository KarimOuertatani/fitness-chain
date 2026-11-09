"use client";

import { useCallback, useState } from "react";
import type { ContractTransactionResponse, JsonRpcSigner, TransactionReceipt } from "ethers";
import { toast } from "sonner";
import { useWallet } from "@/hooks/useWallet";
import { translateError } from "@/lib/errors";

export interface TxMessages {
  /** Message pendant la confirmation on-chain */
  pending?: string;
  /** Message une fois la transaction confirmée */
  success?: string;
}

export type TxAction = (signer: JsonRpcSigner) => Promise<ContractTransactionResponse>;

/**
 * Exécute une transaction avec notifications :
 * « Confirmez dans MetaMask » → « En attente » → « Confirmée » / erreur traduite.
 * Les données sont rafraîchies après confirmation.
 */
export function useTx() {
  const { getSigner, refresh } = useWallet();
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async (action: TxAction, messages: TxMessages = {}): Promise<TransactionReceipt | null> => {
      setPending(true);
      const toastId = toast.loading("Confirmez l'opération dans MetaMask…");
      try {
        const signer = await getSigner();
        const tx = await action(signer);
        toast.loading(messages.pending ?? "Transaction envoyée, en attente de confirmation…", { id: toastId });
        const receipt = await tx.wait();
        toast.success(messages.success ?? "Transaction confirmée.", { id: toastId });
        refresh();
        return receipt;
      } catch (error) {
        toast.error(translateError(error), { id: toastId });
        return null;
      } finally {
        setPending(false);
      }
    },
    [getSigner, refresh]
  );

  return { run, pending };
}
