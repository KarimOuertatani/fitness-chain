"use client";

import { useState } from "react";
import { Coins, ShoppingCart } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useTx } from "@/hooks/useTx";
import { useContractData } from "@/hooks/useContractData";
import { getContract } from "@/lib/contracts";
import { formatFTC, tryParseETH } from "@/lib/format";
import { Button, Card, Input, InfoRow, SectionTitle } from "@/components/ui";

const PRESETS = ["0.01", "0.03", "0.05", "0.1"];

/** Achat de FTC avec de l'ETH (aperçu via previewPurchase). */
export function BuyFtcCard() {
  const { canWrite } = useWallet();
  const { run, pending } = useTx();
  const [ethInput, setEthInput] = useState("0.01");
  const wei = tryParseETH(ethInput);
  const valid = wei !== null && wei > 0n;

  const { data: preview, loading } = useContractData(
    async (provider) => BigInt(await getContract("FitCoin", provider).previewPurchase(wei ?? 0n)),
    ["preview", wei],
    { enabled: valid, requires: ["FitCoin"] }
  );

  const buy = async () => {
    if (!valid || wei === null) return;
    const receipt = await run((signer) => getContract("FitCoin", signer).buyTokens({ value: wei }), {
      success: `Achat confirmé : ${formatFTC(preview ?? null)} reçus.`,
    });
    if (receipt) setEthInput("");
  };

  return (
    <Card>
      <SectionTitle tone="cyan">Acheter des FTC</SectionTitle>
      <p className="mt-2 text-sm text-muted">Taux fixe : 1 ETH = 10 000 FTC.</p>
      <div className="mt-5 flex flex-col gap-4">
        <Input
          label="Montant en ETH"
          inputMode="decimal"
          placeholder="0,01"
          icon={Coins}
          suffix="ETH"
          value={ethInput}
          onChange={(e) => setEthInput(e.target.value)}
          error={ethInput && !valid ? "Montant ETH invalide." : null}
        />
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setEthInput(p)}
              className="rounded-full border border-border bg-white/5 px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-cyan hover:text-white"
            >
              {p.replace(".", ",")} ETH
            </button>
          ))}
        </div>
        <div className="rounded-2xl bg-white/[0.04] px-4 py-2">
          <InfoRow
            label="Vous recevrez"
            strong
            value={<span className="text-gold">{valid ? (loading ? "…" : formatFTC(preview ?? null)) : "—"}</span>}
          />
        </div>
        <Button icon={ShoppingCart} loading={pending} disabled={!canWrite || !valid} onClick={() => void buy()} fullWidth>
          Acheter
        </Button>
      </div>
    </Card>
  );
}
