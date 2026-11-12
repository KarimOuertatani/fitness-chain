"use client";

import { useFtcBalance } from "@/hooks/useFtcBalance";
import { useWallet } from "@/hooks/useWallet";
import { formatFTC, shortAddress } from "@/lib/format";
import { Card, Skeleton, FtcCoin } from "@/components/ui";

/** Carte héro en dégradé avec le solde FTC. */
export function BalanceCard({ subtitle }: { subtitle?: string }) {
  const { address, isAvailable } = useWallet();
  const deployed = isAvailable(["FitCoin"]);
  const { balance, loading, error } = useFtcBalance();

  return (
    <Card variant="hero" padding="lg" className="overflow-hidden">
      <div className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-cyan/30 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-20 -left-10 size-48 rounded-full bg-white/10 blur-3xl" aria-hidden />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/80">{subtitle ?? "Solde FitCoin"}</p>
          <div className="mt-2 min-w-0 truncate text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            {!deployed ? "—" : loading ? <Skeleton className="h-12 w-48 bg-white/20" /> : formatFTC(balance ?? 0n, { withSymbol: false })}
            <span className="ml-2 text-xl font-bold text-gold">FTC</span>
          </div>
          {error && <p className="mt-2 text-sm text-white/80">{error}</p>}
          {address && <p className="mt-3 truncate font-mono text-xs text-white/70">{shortAddress(address, 6)}</p>}
        </div>
        <FtcCoin size={96} priority className="-my-2 drop-shadow-[0_10px_24px_rgba(15,221,252,0.35)] sm:size-[112px]" />
      </div>
    </Card>
  );
}
