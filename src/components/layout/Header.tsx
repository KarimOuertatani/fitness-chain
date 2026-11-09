"use client";

import { Logo } from "@/components/layout/Logo";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { useWallet } from "@/hooks/useWallet";
import { cn } from "@/lib/utils";

function NetworkChip() {
  const { network, isConnected, isCorrectNetwork } = useWallet();
  const ok = !isConnected || isCorrectNetwork;
  return (
    <span className="glass hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-muted sm:inline-flex">
      <span className={cn("size-2 rounded-full", ok ? "bg-success shadow-[0_0_8px_rgba(34,197,94,0.9)]" : "bg-warning")} aria-hidden />
      {network.name}
    </span>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-30 -mx-4 mb-4 flex items-center justify-between gap-3 bg-bg/60 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none">
      <div className="min-w-0 lg:hidden">
        <Logo compact />
      </div>
      <div className="hidden lg:block" />
      <div className="flex shrink-0 items-center gap-2">
        <NetworkChip />
        <div className="lg:hidden">
          <ConnectButton compact />
        </div>
      </div>
    </header>
  );
}
