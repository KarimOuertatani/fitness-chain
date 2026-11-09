"use client";

import type { ReactNode } from "react";
import type { ContractTransactionResponse, JsonRpcSigner } from "ethers";
import { Check, CreditCard, ShieldCheck } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useFtcBalance } from "@/hooks/useFtcBalance";
import { useContractData } from "@/hooks/useContractData";
import { useApproveAndCall, type ApproveStep } from "@/hooks/useApproveAndCall";
import { getContract, getContractAddress, type ContractName } from "@/lib/contracts";
import { formatFTC } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Alert, Button, ButtonLink, InfoRow, Modal, Spinner } from "@/components/ui";

type StepState = "todo" | "active" | "done" | "skipped";

function StepRow({ index, title, text, state }: { index: number; title: string; text: string; state: StepState }) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-2xl border p-3 transition",
        state === "active" ? "border-cyan/50 bg-cyan/10" : state === "done" ? "border-success/40 bg-success/10" : "border-border bg-white/[0.03]"
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
          state === "done" || state === "skipped" ? "bg-success/20 text-success" : state === "active" ? "bg-cyan/20 text-cyan" : "bg-white/10 text-muted"
        )}
      >
        {state === "active" ? <Spinner className="size-4" /> : state === "done" || state === "skipped" ? <Check className="size-4" /> : index}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">
          {index}. {title}
        </p>
        <p className="truncate text-xs text-muted">{state === "skipped" ? "Autorisation déjà suffisante" : text}</p>
      </div>
    </li>
  );
}

function stepStates(step: ApproveStep, approvalDone: boolean, approvalSkipped: boolean, needsApproval: boolean | undefined): [StepState, StepState] {
  const first: StepState = approvalDone
    ? "done"
    : approvalSkipped || needsApproval === false
      ? "skipped"
      : step === "approve" || step === "checking"
        ? "active"
        : "todo";
  const second: StepState = step === "done" ? "done" : step === "call" ? "active" : "todo";
  return [first, second];
}

export interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  /** Montant FTC prélevé */
  amount: bigint;
  /** Contrat qui prélève les FTC */
  spender: ContractName;
  /** Lignes du récapitulatif */
  lines?: { label: string; value: ReactNode }[];
  payLabel?: string;
  successMessage?: string;
  onPay: (signer: JsonRpcSigner) => Promise<ContractTransactionResponse>;
  onSuccess?: () => void;
  children?: ReactNode;
}

/**
 * Modale de paiement FTC en 2 étapes : « 1. Autoriser » (approve si nécessaire) puis « 2. Payer ».
 */
export function PaymentModal({
  open,
  onClose,
  title,
  description,
  amount,
  spender,
  lines,
  payLabel = "Payer",
  successMessage,
  onPay,
  onSuccess,
  children,
}: PaymentModalProps) {
  const { address, canWrite } = useWallet();
  const { balance } = useFtcBalance();
  const { execute, step, busy, approvalDone, approvalSkipped, reset } = useApproveAndCall();
  const spenderAddress = getContractAddress(spender);

  const { data: allowance } = useContractData(
    async (provider) => BigInt(await getContract("FitCoin", provider).allowance(address, spenderAddress)),
    ["allowance", address, spenderAddress, open],
    { enabled: open && !!address && !!spenderAddress, requires: ["FitCoin", spender] }
  );
  const needsApproval = allowance === undefined ? undefined : amount > 0n && allowance < amount;
  const insufficient = balance !== undefined && balance < amount;
  const [first, second] = stepStates(step, approvalDone, approvalSkipped, needsApproval);

  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const pay = async () => {
    const receipt = await execute({ spender, amount, call: onPay, successMessage });
    if (receipt) {
      onSuccess?.();
      reset();
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      description={description}
      dismissible={!busy}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={close} disabled={busy}>
            Annuler
          </Button>
          <Button icon={CreditCard} loading={busy} disabled={!canWrite || insufficient} onClick={() => void pay()}>
            {payLabel} {formatFTC(amount)}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {children}
        {lines && lines.length > 0 && (
          <div className="rounded-2xl bg-white/[0.04] px-4 py-2">
            {lines.map((line) => (
              <InfoRow key={line.label} label={line.label} value={line.value} />
            ))}
            <div className="mt-1 border-t border-border pt-1">
              <InfoRow label="Total" strong value={<span className="text-gold">{formatFTC(amount)}</span>} />
            </div>
          </div>
        )}

        <ol className="flex flex-col gap-2" aria-label="Étapes du paiement">
          <StepRow
            index={1}
            title="Autoriser"
            text={`Autoriser ${spender} à prélever ${formatFTC(amount)}`}
            state={first}
          />
          <StepRow index={2} title="Payer" text="Confirmer l'opération dans MetaMask" state={second} />
        </ol>

        <div className="flex items-center justify-between rounded-2xl border border-border px-4 py-3 text-sm">
          <span className="flex items-center gap-2 text-muted">
            <ShieldCheck className="size-4" aria-hidden /> Votre solde
          </span>
          <span className={cn("font-semibold", insufficient ? "text-danger" : "text-white")}>{formatFTC(balance ?? null)}</span>
        </div>

        {insufficient && (
          <Alert
            tone="danger"
            title="Solde FTC insuffisant"
            action={
              <ButtonLink href="/wallet" variant="glass" size="sm">
                Acheter des FTC
              </ButtonLink>
            }
          >
            Il vous manque {formatFTC(amount - (balance ?? 0n))}.
          </Alert>
        )}
      </div>
    </Modal>
  );
}
