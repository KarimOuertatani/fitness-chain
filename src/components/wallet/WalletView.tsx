"use client";

import { PageHeader } from "@/components/ui";
import { RequireWallet } from "@/components/wallet/RequireWallet";
import { BalanceCard } from "@/components/wallet/BalanceCard";
import { BuyFtcCard } from "@/components/wallet/BuyFtcCard";
import { TransferCard } from "@/components/wallet/TransferCard";
import { TxHistory } from "@/components/wallet/TxHistory";

export function WalletView() {
  return (
    <>
      <PageHeader title="Portefeuille" subtitle="Achetez des FitCoins (FTC), envoyez-les et suivez vos opérations." />
      <RequireWallet message="Connectez MetaMask pour gérer vos FitCoins.">
        <div className="flex flex-col gap-6">
          <BalanceCard />
          <div className="grid gap-6 lg:grid-cols-2">
            <BuyFtcCard />
            <TransferCard />
          </div>
          <TxHistory />
        </div>
      </RequireWallet>
    </>
  );
}
