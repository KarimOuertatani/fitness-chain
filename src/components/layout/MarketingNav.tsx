"use client";

import { LayoutDashboard } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { Logo } from "@/components/layout/Logo";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { ButtonLink } from "@/components/ui";

const LINKS = [
  { href: "#roles", label: "Pour qui ?" },
  { href: "#fonctionnement", label: "Fonctionnement" },
  { href: "/verifier", label: "Vérifier un certificat" },
];

/** Barre de navigation de la vitrine. */
export function MarketingNav() {
  const { address } = useWallet();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Navigation de l'accueil" className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:text-white">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {address ? (
            <ButtonLink href="/dashboard" size="sm" icon={LayoutDashboard}>
              Ouvrir l&apos;application
            </ButtonLink>
          ) : (
            <ConnectButton compact />
          )}
        </div>
      </div>
    </header>
  );
}
