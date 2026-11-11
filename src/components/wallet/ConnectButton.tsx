"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Copy, Download, LogOut, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "@/hooks/useWallet";
import { useRoles } from "@/hooks/useRoles";
import { shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/components/layout/nav";
import { Avatar, Badge, Button, ButtonLink, Skeleton } from "@/components/ui";

/**
 * Bouton de connexion MetaMask.
 * Connecté : avatar + adresse, avec un menu (rôles, copier, portefeuille, déconnexion).
 */
export function ConnectButton({ fullWidth, compact, size }: { fullWidth?: boolean; compact?: boolean; size?: "md" | "lg" }) {
  const { hasMetaMask, address, connecting, connect, disconnect, isCorrectNetwork } = useWallet();
  const { roles } = useRoles();
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

  const buttonSize = compact ? "sm" : (size ?? "md");

  if (hasMetaMask === null) {
    return <Skeleton className={cn("rounded-xl", compact ? "h-10 w-32" : "h-[52px] w-44", fullWidth && "w-full")} />;
  }

  if (hasMetaMask === false) {
    return (
      <ButtonLink href="https://metamask.io/download/" external variant="glass" size={buttonSize} icon={Download} fullWidth={fullWidth}>
        {compact ? "MetaMask" : "Installer MetaMask"}
      </ButtonLink>
    );
  }

  if (!address) {
    return (
      <Button variant="primary" size={buttonSize} icon={Wallet} loading={connecting} onClick={() => void connect()} fullWidth={fullWidth}>
        {compact ? "Connecter" : "Connecter MetaMask"}
      </Button>
    );
  }

  const myRoles = (Object.keys(roles) as (keyof typeof roles)[]).filter((r) => roles[r]);

  return (
    <div ref={ref} className={cn("relative", fullWidth && "w-full")}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2.5 rounded-xl border border-border bg-white/[0.04] font-medium text-white transition hover:border-border-strong",
          compact ? "h-10 pr-2.5 pl-1.5" : "h-[52px] px-3",
          fullWidth && "w-full"
        )}
      >
        <span className="relative">
          <Avatar address={address} size={compact ? 28 : 32} />
          <span
            className={cn(
              "absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-bg",
              isCorrectNetwork ? "bg-success" : "bg-warning"
            )}
            aria-hidden
          />
        </span>
        <span className="min-w-0 flex-1 truncate text-left font-mono text-[13px]">{shortAddress(address)}</span>
        <ChevronDown className={cn("size-4 text-subtle transition", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 w-72 overflow-hidden rounded-2xl border border-border-strong bg-bg-elevated/95 shadow-2xl backdrop-blur-xl",
            fullWidth ? "bottom-full left-0 mb-2" : "top-full right-0 mt-2"
          )}
        >
          <div className="flex items-center gap-3 border-b border-border p-4">
            <Avatar address={address} size={40} />
            <div className="min-w-0">
              <p className="truncate font-mono text-sm text-white">{shortAddress(address, 6)}</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {myRoles.length === 0 ? (
                  <span className="text-xs text-subtle">Aucun rôle pour l&apos;instant</span>
                ) : (
                  myRoles.map((r) => (
                    <Badge key={r} tone="cyan">
                      {ROLE_LABELS[r]}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>
          <div className="p-1.5">
            <button
              role="menuitem"
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white hover:bg-white/[0.06]"
              onClick={() => {
                void navigator.clipboard?.writeText(address).then(() => toast.success("Adresse copiée."));
                setOpen(false);
              }}
            >
              <Copy className="size-4 text-muted" aria-hidden /> Copier l&apos;adresse
            </button>
            <Link
              role="menuitem"
              href="/wallet"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white hover:bg-white/[0.06]"
            >
              <Wallet className="size-4 text-muted" aria-hidden /> Portefeuille
            </Link>
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
        </div>
      )}
    </div>
  );
}
