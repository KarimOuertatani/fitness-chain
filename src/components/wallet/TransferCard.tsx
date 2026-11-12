"use client";

import { useState } from "react";
import { isAddress } from "ethers";
import { Send, User } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useTx } from "@/hooks/useTx";
import { useFtcBalance } from "@/hooks/useFtcBalance";
import { getContract } from "@/lib/contracts";
import { formatFTC, tryParseFTC } from "@/lib/format";
import { Button, Card, Input, SectionTitle, FtcGlyph } from "@/components/ui";

export function TransferCard() {
  const { canWrite, address } = useWallet();
  const { balance } = useFtcBalance();
  const { run, pending } = useTx();
  const [to, setTo] = useState("");
  const [amountInput, setAmountInput] = useState("");

  const amount = tryParseFTC(amountInput);
  const toValid = isAddress(to);
  const self = toValid && address?.toLowerCase() === to.toLowerCase();
  const tooMuch = amount !== null && balance !== undefined && amount > balance;
  const valid = toValid && !self && amount !== null && amount > 0n && !tooMuch;

  const send = async () => {
    if (!valid || amount === null) return;
    const receipt = await run((signer) => getContract("FitCoin", signer).transfer(to, amount), {
      success: `${formatFTC(amount)} envoyés.`,
    });
    if (receipt) {
      setTo("");
      setAmountInput("");
    }
  };

  return (
    <Card variant="teal">
      <SectionTitle tone="cyan">Transférer des FTC</SectionTitle>
      <div className="mt-5 flex flex-col gap-4">
        <Input
          label="Adresse du destinataire"
          placeholder="0x…"
          icon={User}
          value={to}
          onChange={(e) => setTo(e.target.value.trim())}
          error={to && !toValid ? "Adresse invalide." : self ? "Vous ne pouvez pas vous envoyer des FTC." : null}
          autoComplete="off"
          spellCheck={false}
        />
        <Input
          label="Montant"
          inputMode="decimal"
          placeholder="0"
          icon={FtcGlyph}
          suffix="FTC"
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          error={amountInput && amount === null ? "Montant invalide." : tooMuch ? "Solde insuffisant." : null}
          hint={balance !== undefined ? `Disponible : ${formatFTC(balance)}` : undefined}
        />
        <Button variant="secondary" icon={Send} loading={pending} disabled={!canWrite || !valid} onClick={() => void send()} fullWidth>
          Envoyer
        </Button>
      </div>
    </Card>
  );
}
