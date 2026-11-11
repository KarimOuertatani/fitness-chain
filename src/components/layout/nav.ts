import {
  Building2,
  Dumbbell,
  Gift,
  GraduationCap,
  LayoutDashboard,
  Landmark,
  ShieldCheck,
  Vote,
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
  /** Phrase courte (tableau de bord, menu mobile) */
  description: string;
}

export const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, description: "Votre vue d'ensemble" },
  { href: "/wallet", label: "Portefeuille", icon: Wallet, description: "Acheter, envoyer et suivre vos FTC" },
  { href: "/salles", label: "Salles", icon: Dumbbell, role: "member", description: "Trouver une salle et s'abonner" },
  { href: "/recompenses", label: "Récompenses", icon: Gift, role: "member", description: "Récompense du jour et séries" },
  { href: "/verifier", label: "Vérifier", icon: ShieldCheck, description: "Contrôler un certificat de coach" },
];

export const SPACES_NAV: NavItem[] = [
  { href: "/centre", label: "Espace centre", icon: Landmark, role: "center", description: "Formations, demandes et certificats" },
  { href: "/coach", label: "Espace coach", icon: GraduationCap, role: "coach", description: "Formations, certificats et salles" },
  { href: "/salle", label: "Ma salle", icon: Building2, role: "gym", description: "Gérer votre salle et votre équipe" },
  { href: "/gouvernance", label: "Gouvernance", icon: Vote, role: "center", description: "Votes de la DAO des centres" },
];

export const ROLE_LABELS: Record<keyof Roles, string> = {
  center: "Centre",
  coach: "Coach",
  gym: "Salle",
  member: "Adhérent",
};

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/salle") return pathname === "/salle";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Élément de navigation correspondant à la page courante (pour le fil d'Ariane). */
export function findNavItem(pathname: string): { item: NavItem; group: string } | null {
  for (const item of MAIN_NAV) if (isActivePath(pathname, item.href)) return { item, group: "Général" };
  for (const item of SPACES_NAV) if (isActivePath(pathname, item.href)) return { item, group: "Espaces" };
  return null;
}
