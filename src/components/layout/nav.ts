import {
  Building2,
  Dumbbell,
  Gift,
  GraduationCap,
  LayoutDashboard,
  Landmark,
  ScanLine,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Roles } from "@/hooks/useRoles";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Rôle mis en avant pour cet espace */
  role?: keyof Roles;
}

export const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/wallet", label: "Portefeuille", icon: Wallet },
  { href: "/salles", label: "Salles", icon: Dumbbell, role: "member" },
  { href: "/recompenses", label: "Récompenses", icon: Gift, role: "member" },
  { href: "/verifier", label: "Vérifier", icon: ShieldCheck },
];

export const SPACES_NAV: NavItem[] = [
  { href: "/centre", label: "Espace centre", icon: Landmark, role: "center" },
  { href: "/coach", label: "Espace coach", icon: GraduationCap, role: "coach" },
  { href: "/salle", label: "Ma salle", icon: Building2, role: "gym" },
  { href: "/gouvernance", label: "Gouvernance", icon: ShieldCheck, role: "center" },
];

export const SCAN_ICON = ScanLine;

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
