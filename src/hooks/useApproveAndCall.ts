"use client";

import { useCallback, useState } from "react";
import type { ContractTransactionResponse, JsonRpcSigner, TransactionReceipt } from "ethers";
import { toast } from "sonner";
import { useWallet } from "@/hooks/useWallet";
import { getContract, getContractAddress, type ContractName } from "@/lib/contracts";
import { translateError } from "@/lib/errors";
import { formatFTC } from "@/lib/format";

/** idle → checking → approve (1. Autoriser) → call (2. Payer) → done */
export type ApproveStep = "idle" | "checking" | "approve" | "call" | "done";

export interface ApproveAndCallParams {
  /** Contrat qui prélèvera les FTC (CoachCertificate, GymManager…) */
  spender: ContractName;
  /** Montant FTC à autoriser (18 décimales) */
  amount: bigint;
  /** Appel métier exécuté après l'autorisation */
  call: (signer: JsonRpcSigner) => Promise<ContractTransactionResponse>;
  successMessage?: string;
}

/**
 * Enchaîne `approve` (seulement si l'allowance est insuffisante) puis l'appel métier.
 */
export function useApproveAndCall() {
  const { getSigner, refresh } = useWallet();
  const [step, setStep] = useState<ApproveStep>("idle");
  const [approvalDone, setApprovalDone] = useState(false);
  const [approvalSkipped, setApprovalSkipped] = useState(false);

  const reset = useCallback(() => {
    setStep("idle");
    setApprovalDone(false);
    setApprovalSkipped(false);
  }, []);

  const execute = useCallback(
    async ({ spender, amount, call, successMessage }: ApproveAndCallParams): Promise<TransactionReceipt | null> => {
      setStep("checking");
      const toastId = toast.loading("Vérification du solde et de l'autorisation…");
      try {
        const signer = await getSigner();
        const owner = await signer.getAddress();
        const spenderAddress = getContractAddress(spender);
        if (!spenderAddress) throw new Error("Contrats non déployés sur ce réseau.");
        const fitCoin = getContract("FitCoin", signer);

        const balance = BigInt(await fitCoin.balanceOf(owner));
        if (balance < amount) {
          throw new Error(
            `Solde FTC insuffisant : ${formatFTC(balance)} disponibles, ${formatFTC(amount)} requis. Achetez des FTC dans le portefeuille.`
          );
        }

        // Étape 1 : Autoriser
        const allowance = BigInt(await fitCoin.allowance(owner, spenderAddress));
        if (amount > 0n && allowance < amount) {
          setStep("approve");
          toast.loading(`1/2 · Autorisez ${formatFTC(amount)} dans MetaMask…`, { id: toastId });
          const approveTx = (await fitCoin.approve(spenderAddress, amount)) as ContractTransactionResponse;
          toast.loading("1/2 · Autorisation en attente de confirmation…", { id: toastId });
          await approveTx.wait();
          setApprovalDone(true);
        } else {
          setApprovalSkipped(true);
        }

        // Étape 2 : Payer
        setStep("call");
        toast.loading("2/2 · Confirmez le paiement dans MetaMask…", { id: toastId });
        const tx = await call(signer);
        toast.loading("2/2 · Paiement en attente de confirmation…", { id: toastId });
        const receipt = await tx.wait();

        setStep("done");
        toast.success(successMessage ?? "Paiement confirmé.", { id: toastId });
        refresh();
        return receipt;
      } catch (error) {
        toast.error(translateError(error), { id: toastId });
        setStep("idle");
        return null;
      }
    },
    [getSigner, refresh]
  );

  const busy = step === "checking" || step === "approve" || step === "call";
  return { execute, step, busy, approvalDone, approvalSkipped, reset };
}
