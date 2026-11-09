"use client";

import type { ReactNode } from "react";
import { Wallet } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { Card, EmptyState, Skeleton } from "@/components/ui";
import { ConnectButton } from "@/components/wallet/ConnectButton";

/** Affiche `children` seulement si un wallet est connecté ; sinon une invitation à se connecter. */
export function RequireWallet({ children, message }: { children: ReactNode; message?: string }) {
  const { address, hasMetaMask } = useWallet();
  if (hasMetaMask === null) return <Skeleton className="h-64 rounded-3xl" />;
  if (!address) {
    return (
      <Card>
        <EmptyState
          icon={Wallet}
          title="Connectez votre wallet"
          description={message ?? "Connectez MetaMask pour accéder à cet espace."}
          action={<ConnectButton />}
        />
      </Card>
    );
  }
  return <>{children}</>;
}
