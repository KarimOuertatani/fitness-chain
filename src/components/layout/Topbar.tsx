"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Coins } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useFtcBalance } from "@/hooks/useFtcBalance";
import { formatFTC } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/Logo";
import { findNavItem } from "@/components/layout/nav";
import { ConnectButton } from "@/components/wallet/ConnectButton";

function NetworkPill() {
  const { network, isConnected, isCorrectNetwork } = useWallet();
  const ok = !isConnected || isCorrectNetwork;
  return (
    <span className="hidden h-9 items-center gap-2 rounded-xl border border-border bg-white/[0.04] px-3 text-xs font-medium text-muted md:inline-flex">
      <span className={cn("size-2 rounded-full", ok ? "bg-success" : "bg-warning")} aria-hidden />
      {network.name}
    </span>
  );
}

function BalancePill() {
  const { address, isAvailable } = useWallet();
  const { balance } = useFtcBalance();
  if (!address || !isAvailable(["FitCoin"])) return null;
  return (
    <Link
      href="/wallet"
      className="hidden h-9 items-center gap-2 rounded-xl border border-gold/25 bg-gold/[0.08] px-3 text-sm font-semibold text-gold tabular-nums transition hover:border-gold/45 sm:inline-flex"
      title="Ouvrir le portefeuille"
    >
      <Coins className="size-4" aria-hidden />
      {formatFTC(balance ?? null)}
    </Link>
  );
}

function Breadcrumb() {
  const pathname = usePathname();
  const found = findNavItem(pathname);
  if (!found) return null;
  const isDetail = pathname !== found.item.href;
  return (
    <nav aria-label="Fil d'Ariane" className="hidden min-w-0 items-center gap-1.5 text-sm lg:flex">
      <span className="text-subtle">{found.group}</span>
      <ChevronRight className="size-4 text-subtle" aria-hidden />
      {isDetail ? (
        <>
          <Link href={found.item.href} className="text-muted hover:text-white">
            {found.item.label}
          </Link>
          <ChevronRight className="size-4 text-subtle" aria-hidden />
          <span className="truncate font-medium text-white">Détail</span>
        </>
      ) : (
        <span className="truncate font-medium text-white">{found.item.label}</span>
      )}
    </nav>
  );
}

/** Barre du haut : fil d'Ariane (desktop) ou logo (mobile), réseau, solde et compte. */
export function Topbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
        <div className="min-w-0 lg:hidden">
          <Logo compact />
        </div>
        <Breadcrumb />
        <div className="flex shrink-0 items-center gap-2">
          <NetworkPill />
          <BalancePill />
          <ConnectButton compact />
        </div>
      </div>
    </header>
  );
}
