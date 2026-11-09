"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarCheck, Coins, Flame, type LucideIcon } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useRoles } from "@/hooks/useRoles";
import { useFtcBalance } from "@/hooks/useFtcBalance";
import { useContractData } from "@/hooks/useContractData";
import { useNow } from "@/hooks/useNow";
import { getContract } from "@/lib/contracts";
import { toIds, toSubscription } from "@/lib/mappers";
import { formatFTC, shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BalanceCard } from "@/components/wallet/BalanceCard";
import { RequireWallet } from "@/components/wallet/RequireWallet";
import { MAIN_NAV, SPACES_NAV, type NavItem } from "@/components/layout/nav";
import { Badge, Card, IconTile, SectionTitle, Skeleton, StatCard, type IconTone } from "@/components/ui";

interface DashboardStats {
  streak: bigint;
  activeSubscriptions: number;
  certificates: number;
}

const SECTION_TEXT: Record<string, string> = {
  "/dashboard": "Votre vue d'ensemble",
  "/wallet": "Acheter, envoyer et suivre vos FTC",
  "/salles": "Trouver une salle et s'abonner",
  "/recompenses": "Récompense du jour et séries",
  "/verifier": "Contrôler un certificat de coach",
  "/centre": "Formations, demandes et certificats",
  "/coach": "Formations, certificats et salles",
  "/salle": "Gérer votre salle et votre équipe",
  "/gouvernance": "Votes de la DAO des centres",
};

const TONES: IconTone[] = ["violet", "cyan", "blue", "gold"];

function greeting(nowMs: number): string {
  if (nowMs === 0) return "Bonjour";
  const hour = new Date(nowMs).getHours();
  return hour >= 18 || hour < 5 ? "Bonsoir" : "Bonjour";
}

function SectionLink({ item, index, mine }: { item: NavItem; index: number; mine: boolean }) {
  const Icon: LucideIcon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex min-w-0 items-center gap-4 rounded-3xl border p-4 transition hover:-translate-y-0.5 hover:shadow-card-hover",
        mine ? "border-primary-light/40 bg-primary/15" : "glass"
      )}
    >
      <IconTile icon={Icon} tone={TONES[index % TONES.length]} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-semibold text-white">
          <span className="truncate">{item.label}</span>
          {mine && <Badge tone="cyan">Votre rôle</Badge>}
        </p>
        <p className="truncate text-sm text-muted">{SECTION_TEXT[item.href]}</p>
      </div>
      <ArrowRight className="size-5 shrink-0 text-subtle transition group-hover:translate-x-1 group-hover:text-white" aria-hidden />
    </Link>
  );
}

function DashboardContent() {
  const { address, deployed } = useWallet();
  const { roles } = useRoles();
  const { balance, loading: balanceLoading } = useFtcBalance();
  const now = useNow();

  const { data: stats, loading } = useContractData(
    async (provider): Promise<DashboardStats> => {
      const rewards = getContract("RewardManager", provider);
      const gyms = getContract("GymManager", provider);
      const certificates = getContract("CoachCertificate", provider);
      const [streak, memberGyms, certs] = await Promise.all([
        rewards.getStreak(address),
        gyms.getMemberGyms(address),
        certificates.getCertificatesOf(address),
      ]);
      const gymIds = toIds(memberGyms);
      const subs = await Promise.all(gymIds.map(async (id) => toSubscription(await gyms.getSubscription(address, id))));
      const nowSec = Math.floor(Date.now() / 1000);
      return {
        streak: BigInt(streak),
        activeSubscriptions: subs.filter((s) => s.endTime > nowSec).length,
        certificates: (certs as unknown[]).length,
      };
    },
    ["dashboard", address],
    { enabled: !!address }
  );

  const sections = [...SPACES_NAV, ...MAIN_NAV.filter((i) => i.href !== "/dashboard")];
  const sorted = [...sections].sort((a, b) => Number(!!b.role && roles[b.role]) - Number(!!a.role && roles[a.role]));
  const dateLabel = now
    ? new Date(now).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
    : "";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
          {greeting(now)}, <span className="text-gradient font-mono">{shortAddress(address)}</span> 👋
        </h1>
        <p className="mt-2 flex items-center gap-2 text-sm text-muted">
          <span className="size-2 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.9)]" aria-hidden />
          <span className="capitalize">{dateLabel || <Skeleton className="inline-block h-4 w-32 align-middle" />}</span>
          <span aria-hidden>·</span>
          <span>En ligne</span>
        </p>
      </div>

      <BalanceCard subtitle="Votre solde FitCoin" />

      <section className="flex flex-col gap-4">
        <SectionTitle>Activités du jour</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard icon={Coins} tone="gold" label="Solde" loading={deployed && balanceLoading} value={<span className="text-gold">{formatFTC(balance ?? null)}</span>} />
          <StatCard icon={Flame} tone="orange" label="Série de récompenses" teal loading={deployed && loading} value={stats ? `${stats.streak.toString()} j` : "—"} hint="Jours consécutifs" />
          <StatCard icon={CalendarCheck} tone="cyan" label="Abonnements actifs" teal loading={deployed && loading} value={stats ? stats.activeSubscriptions : "—"} />
          <StatCard icon={BadgeCheck} tone="green" label="Certificats" loading={deployed && loading} value={stats ? stats.certificates : "—"} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle tone="cyan">Vos espaces</SectionTitle>
        <div className="grid gap-3 md:grid-cols-2">
          {sorted.map((item, i) => (
            <SectionLink key={item.href} item={item} index={i} mine={!!item.role && roles[item.role]} />
          ))}
        </div>
        {!roles.center && !roles.coach && !roles.gym && !roles.member && deployed && (
          <Card variant="flat" padding="sm" className="text-sm text-muted">
            Aucun rôle détecté pour cette adresse : achetez des FTC dans le portefeuille, puis abonnez-vous à une salle,
            demandez une formation ou inscrivez votre salle.
          </Card>
        )}
      </section>
    </div>
  );
}

export function Dashboard() {
  return (
    <RequireWallet message="Connectez MetaMask pour afficher votre tableau de bord.">
      <DashboardContent />
    </RequireWallet>
  );
}
