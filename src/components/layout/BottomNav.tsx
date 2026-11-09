"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Dumbbell, Gift, LayoutDashboard, LayoutGrid, ScanLine, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRoles } from "@/hooks/useRoles";
import { MAIN_NAV, SPACES_NAV, isActivePath } from "@/components/layout/nav";

const TABS = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard },
  { href: "/salles", label: "Salles", icon: Dumbbell },
  { href: "/recompenses", label: "Récompenses", icon: Gift },
];

/** Barre flottante en pilule (mobile) avec bouton central rond en dégradé. */
export function BottomNav() {
  const pathname = usePathname();
  const { roles } = useRoles();
  const [menuOpen, setMenuOpen] = useState(false);

  const tab = (item: (typeof TABS)[number]) => {
    const active = isActivePath(pathname, item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-semibold transition",
          active ? "bg-primary/25 text-primary-light" : "text-muted hover:text-white"
        )}
      >
        <Icon className="size-5" aria-hidden />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  const scanActive = isActivePath(pathname, "/verifier");

  return (
    <>
      <nav
        aria-label="Navigation mobile"
        className="glass fixed inset-x-4 bottom-4 z-40 flex items-center gap-1 rounded-full px-2 py-2 shadow-2xl lg:hidden"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {tab(TABS[0])}
        {tab(TABS[1])}
        <Link
          href="/verifier"
          aria-label="Vérifier un certificat"
          aria-current={scanActive ? "page" : undefined}
          className="relative -mt-8 flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-hero text-white shadow-[0_0_28px_rgba(124,58,237,0.85)] ring-4 ring-bg transition active:scale-95"
        >
          <ScanLine className="size-7" aria-hidden />
        </Link>
        {tab(TABS[2])}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          className="flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-semibold text-muted transition hover:text-white"
        >
          <LayoutGrid className="size-5" aria-hidden />
          <span>Menu</span>
        </button>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-bg-deep/70 backdrop-blur-sm" onClick={() => setMenuOpen(false)} aria-hidden />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              exit={{ y: 60 }}
              className="absolute inset-x-4 bottom-4 rounded-3xl border border-border-strong bg-bg-elevated/95 p-4 backdrop-blur-xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold text-white">Toutes les sections</p>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Fermer le menu"
                  className="rounded-xl p-2 text-muted hover:bg-white/10 hover:text-white"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[...MAIN_NAV, ...SPACES_NAV].map((item) => {
                  const Icon = item.icon;
                  const active = isActivePath(pathname, item.href);
                  const mine = !!item.role && roles[item.role];
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "relative flex flex-col items-center gap-2 rounded-2xl border p-3 text-center text-[11px] font-semibold transition",
                        active ? "border-primary-light/50 bg-primary/20 text-primary-light" : "border-border bg-white/[0.03] text-muted hover:text-white"
                      )}
                    >
                      {mine && <span className="absolute top-2 right-2 size-2 rounded-full bg-cyan" aria-label="Votre rôle" />}
                      <Icon className="size-5" aria-hidden />
                      <span className="leading-tight">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
