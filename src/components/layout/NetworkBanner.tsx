"use client";

import { AlertTriangle, Download, Info, RefreshCw, ServerCrash } from "lucide-react";
import { CONTRACT_NAMES } from "@/lib/contracts";
import { useWallet } from "@/hooks/useWallet";
import { Button, ButtonLink } from "@/components/ui";

/**
 * Bannières globales :
 * - contrats non déployés sur le réseau cible ;
 * - MetaMask absent ;
 * - mauvais réseau.
 */
export function NetworkBanner() {
  const { deployed, deployedContracts, hasMetaMask, isConnected, isCorrectNetwork, network, switchNetwork } = useWallet();
  const missing = CONTRACT_NAMES.filter((n) => !deployedContracts.includes(n));
  const partial = deployedContracts.length > 0 && !deployed;

  return (
    <div className="mb-4 flex flex-col gap-3 empty:hidden">
      {partial && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-cyan/30 bg-cyan/10 p-4 text-sm">
          <Info className="mt-0.5 size-5 shrink-0 text-cyan" aria-hidden />
          <p className="min-w-0 text-white/80">
            <span className="font-semibold text-cyan">Déploiement partiel :</span> {deployedContracts.join(", ")} disponible
            {deployedContracts.length > 1 ? "s" : ""}. Pas encore déployé{missing.length > 1 ? "s" : ""} : {missing.join(", ")} — les
            pages qui en dépendent restent désactivées.
          </p>
        </div>
      )}

      {deployedContracts.length === 0 && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-warning/35 bg-warning/10 p-4 text-sm">
          <ServerCrash className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
          <div className="min-w-0">
            <p className="font-semibold text-warning">Contrats non déployés sur ce réseau</p>
            <p className="mt-0.5 text-white/75">
              Aucune adresse trouvée pour {network.name} (chainId {network.chainId}). Les actions sont désactivées. Lancez{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">npm run deploy:local</code> dans{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">blockchain/</code>.
            </p>
          </div>
        </div>
      )}

      {hasMetaMask === false && (
        <div className="flex flex-col gap-3 rounded-2xl border border-cyan/30 bg-cyan/10 p-4 text-sm sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <Download className="mt-0.5 size-5 shrink-0 text-cyan" aria-hidden />
            <p className="text-white/80">
              <span className="font-semibold text-cyan">MetaMask n&apos;est pas installé.</span> Il est nécessaire pour
              effectuer des transactions. La vérification des certificats reste possible sans wallet.
            </p>
          </div>
          <ButtonLink href="https://metamask.io/download/" external variant="glass" size="sm" icon={Download}>
            Installer MetaMask
          </ButtonLink>
        </div>
      )}

      {hasMetaMask && isConnected && !isCorrectNetwork && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-danger/35 bg-danger/10 p-4 text-sm sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
            <p className="text-white/80">
              <span className="font-semibold text-danger">Mauvais réseau.</span> MetaMask doit être connecté à{" "}
              {network.name} (chainId {network.chainId}).
            </p>
          </div>
          <Button variant="danger" size="sm" icon={RefreshCw} onClick={() => void switchNetwork()}>
            Changer de réseau
          </Button>
        </div>
      )}
    </div>
  );
}
