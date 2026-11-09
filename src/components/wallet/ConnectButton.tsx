"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Download, LogOut, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "@/hooks/useWallet";
import { shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button, ButtonLink, Skeleton } from "@/components/ui";

export function ConnectButton({ fullWidth, compact, size }: { fullWidth?: boolean; compact?: boolean; size?: "md" | "lg" }) {
  const { hasMetaMask, address, connecting, connect, disconnect, isCorrectNetwork } = useWallet();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (hasMetaMask === null) {
    return <Skeleton className={cn("h-10 rounded-2xl", fullWidth ? "w-full" : "w-36", !compact && "h-[52px]")} />;
  }

  if (hasMetaMask === false) {
    return (
      <ButtonLink
        href="https://metamask.io/download/"
        external
        variant="glass"
        size={compact ? "sm" : (size ?? "md")}
        icon={Download}
        fullWidth={fullWidth}
      >
        {compact ? "MetaMask" : "Installer MetaMask"}
      </ButtonLink>
    );
  }

  if (!address) {
    return (
      <Button
        variant="primary"
        size={compact ? "sm" : (size ?? "md")}
        icon={Wallet}
        loading={connecting}
        onClick={() => void connect()}
        fullWidth={fullWidth}
      >
        {compact ? "Connecter" : "Connecter MetaMask"}
      </Button>
    );
  }

  return (
    <div ref={ref} className={cn("relative", fullWidth && "w-full")}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "glass flex items-center gap-2.5 font-semibold text-white transition hover:border-border-strong",
          compact ? "h-10 rounded-xl px-3 text-sm" : "h-[52px] rounded-2xl px-4",
          fullWidth && "w-full"
        )}
      >
        <span
          className={cn(
            "size-2.5 shrink-0 rounded-full",
            isCorrectNetwork ? "bg-success shadow-[0_0_8px_rgba(34,197,94,0.9)]" : "bg-warning"
          )}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate text-left font-mono text-sm">{shortAddress(address)}</span>
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 w-56 rounded-2xl border border-border-strong bg-bg-elevated/95 p-1.5 shadow-2xl backdrop-blur-xl",
            fullWidth ? "bottom-full left-0 mb-2" : "top-full right-0 mt-2"
          )}
        >
          <button
            role="menuitem"
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white hover:bg-white/10"
            onClick={() => {
              void navigator.clipboard?.writeText(address).then(() => toast.success("Adresse copiée."));
              setOpen(false);
            }}
          >
            <Copy className="size-4 text-muted" aria-hidden /> Copier l&apos;adresse
          </button>
          <button
            role="menuitem"
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-danger hover:bg-danger/10"
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
          >
            <LogOut className="size-4" aria-hidden /> Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}
