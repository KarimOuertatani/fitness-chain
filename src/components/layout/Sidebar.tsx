"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useRoles } from "@/hooks/useRoles";
import { Logo } from "@/components/layout/Logo";
import { MAIN_NAV, SPACES_NAV, isActivePath, type NavItem } from "@/components/layout/nav";

function NavLink({ item, mine }: { item: NavItem; mine: boolean }) {
  const pathname = usePathname();
  const active = isActivePath(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition",
        active ? "bg-primary/15 text-white" : "text-muted hover:bg-white/[0.04] hover:text-white"
      )}
    >
      {active && <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-primary-light" aria-hidden />}
      <Icon className={cn("size-[18px] shrink-0", active ? "text-primary-light" : "text-subtle group-hover:text-muted")} aria-hidden />
      <span className="flex-1 truncate">{item.label}</span>
      {mine && (
        <span className="rounded-md bg-cyan/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan" title="Correspond à l'un de vos rôles">
          Vous
        </span>
      )}
    </Link>
  );
}

function NavGroup({ title, items }: { title: string; items: NavItem[] }) {
  const { roles } = useRoles();
  return (
    <div className="flex flex-col gap-0.5">
      <p className="px-3 pb-2 text-[11px] font-semibold tracking-[0.14em] text-subtle uppercase">{title}</p>
      {items.map((item) => (
        <NavLink key={item.href} item={item} mine={!!item.role && roles[item.role]} />
      ))}
    </div>
  );
}

/** Barre latérale desktop en verre dépoli, pleine hauteur. */
export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[17rem] flex-col border-r border-border bg-bg-elevated/55 backdrop-blur-xl lg:flex">
      <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
        <Logo />
      </div>
      <nav aria-label="Navigation principale" className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto px-3 py-6">
        <NavGroup title="Général" items={MAIN_NAV} />
        <NavGroup title="Espaces" items={SPACES_NAV} />
      </nav>
      <div className="border-t border-border p-4">
        <p className="text-[11px] leading-relaxed text-subtle">
          Les données affichées sont lues directement sur la blockchain. Aucune base de données.
        </p>
      </div>
    </aside>
  );
}
