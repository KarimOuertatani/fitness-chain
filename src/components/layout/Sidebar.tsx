"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useRoles } from "@/hooks/useRoles";
import { Logo } from "@/components/layout/Logo";
import { MAIN_NAV, SPACES_NAV, isActivePath, type NavItem } from "@/components/layout/nav";
import { ConnectButton } from "@/components/wallet/ConnectButton";

function NavLink({ item, highlighted }: { item: NavItem; highlighted: boolean }) {
  const pathname = usePathname();
  const active = isActivePath(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
        active ? "bg-primary/20 text-primary-light shadow-[inset_0_0_0_1px_rgba(139,92,246,0.35)]" : "text-muted hover:bg-white/5 hover:text-white"
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden />
      <span className="flex-1 truncate">{item.label}</span>
      {highlighted && (
        <span className="size-2 rounded-full bg-cyan shadow-[0_0_8px_rgba(34,211,238,0.9)]" title="Votre rôle" aria-label="Votre rôle" />
      )}
    </Link>
  );
}

export function Sidebar() {
  const { roles } = useRoles();
  return (
    <aside className="glass fixed inset-y-4 left-4 z-40 hidden w-64 flex-col rounded-3xl p-4 lg:flex">
      <div className="px-2 pt-2 pb-6">
        <Logo />
      </div>
      <nav aria-label="Navigation principale" className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
        <div className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-[11px] font-semibold tracking-[0.18em] text-subtle uppercase">Général</p>
          {MAIN_NAV.map((item) => (
            <NavLink key={item.href} item={item} highlighted={!!item.role && roles[item.role]} />
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-[11px] font-semibold tracking-[0.18em] text-subtle uppercase">Espaces</p>
          {SPACES_NAV.map((item) => (
            <NavLink key={item.href} item={item} highlighted={!!item.role && roles[item.role]} />
          ))}
        </div>
      </nav>
      <div className="border-t border-border pt-4">
        <ConnectButton fullWidth />
      </div>
    </aside>
  );
}
