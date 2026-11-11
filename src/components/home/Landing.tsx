"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Coins,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  ShieldCheck,
  UserRound,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { LogoMark } from "@/components/layout/Logo";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { ButtonLink, Card, IconTile, SectionTitle, type IconTone } from "@/components/ui";

const ROLES: { href: string; title: string; text: string; icon: LucideIcon; tone: IconTone; teal?: boolean }[] = [
  { href: "/centre", title: "Un centre", text: "Publiez vos formations et certifiez les coachs sur la blockchain.", icon: Landmark, tone: "violet" },
  { href: "/coach", title: "Un coach", text: "Suivez une formation, obtenez un certificat infalsifiable et rejoignez des salles.", icon: GraduationCap, tone: "cyan", teal: true },
  { href: "/salle", title: "Une salle", text: "Inscrivez votre salle, recrutez des coachs certifiés et encaissez les abonnements.", icon: Building2, tone: "blue", teal: true },
  { href: "/salles", title: "Un adhérent", text: "Abonnez-vous, choisissez un coach privé et gagnez des FitCoins chaque jour.", icon: UserRound, tone: "gold" },
];

const STEPS: { title: string; text: string; icon: LucideIcon }[] = [
  { title: "Gouvernance", text: "Les centres agréés votent l'entrée et l'exclusion des centres dans une DAO, sans administrateur.", icon: Vote },
  { title: "Certification", text: "Le coach paie sa formation en séquestre ; le centre valide la réussite et émet un NFT Soulbound.", icon: ShieldCheck },
  { title: "Recrutement", text: "Les salles recrutent uniquement des coachs dont le certificat est valide on-chain.", icon: Building2 },
  { title: "Récompenses", text: "Les adhérents paient en FTC et gagnent des bonus quotidiens et des séries de 7 jours.", icon: Coins },
];

export function Landing() {
  const { address } = useWallet();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 pt-6 pb-16 sm:gap-20 sm:px-6">
      {/* Héro */}
      <section className="relative flex flex-col items-center pt-6 text-center sm:pt-12">
        <div className="relative flex size-64 items-center justify-center sm:size-80" aria-hidden>
          <div className="animate-pulse-glow absolute size-40 rounded-full bg-primary/35 blur-3xl sm:size-52" />
          <div className="animate-orbit absolute inset-0 rounded-full border border-primary-light/25">
            <span className="absolute top-1/2 -left-1.5 size-3 rounded-full bg-cyan shadow-[0_0_14px_rgba(34,211,238,1)]" />
          </div>
          <div className="animate-orbit-reverse absolute inset-8 rounded-full border border-cyan/20 sm:inset-10">
            <span className="absolute -top-1 left-1/2 size-2.5 rounded-full bg-primary-light shadow-[0_0_12px_rgba(139,92,246,1)]" />
          </div>
          <div className="absolute inset-16 rounded-full border border-white/10 sm:inset-20" />
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6 }}>
            <LogoMark size={104} />
          </motion.div>
        </div>

        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="flex flex-col items-center"
        >
          <h1 className="mt-2 text-3xl font-extrabold tracking-[0.3em] text-white sm:text-5xl">
            FITNESS <span className="text-gradient">CHAIN</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted sm:text-lg">La confiance fitness, propulsée par la blockchain</p>
          <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
            {address ? (
              <ButtonLink href="/dashboard" size="lg" icon={LayoutDashboard}>
                Accéder au tableau de bord
              </ButtonLink>
            ) : (
              <ConnectButton size="lg" />
            )}
            <ButtonLink href="/verifier" variant="glass" size="lg" icon={ShieldCheck}>
              Vérifier un certificat
            </ButtonLink>
          </div>
          <p className="mt-3 text-xs text-subtle">La vérification est publique : aucun wallet n&apos;est nécessaire.</p>
        </motion.div>
      </section>

      {/* Je suis… */}
      <section id="roles" aria-labelledby="roles-title" className="flex scroll-mt-24 flex-col gap-5">
        <SectionTitle as="h2">
          <span id="roles-title">Je suis…</span>
        </SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ROLES.map((role, i) => (
            <motion.div key={role.href} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
              <Link href={role.href} className="group block h-full rounded-3xl focus-visible:outline-offset-4">
                <Card variant={role.teal ? "teal" : "default"} interactive className="flex h-full flex-col gap-4">
                  <IconTile icon={role.icon} tone={role.tone} size="lg" />
                  <div className="flex-1">
                    <p className="text-lg font-bold text-white">{role.title}</p>
                    <p className="mt-1 text-sm text-muted">{role.text}</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan">
                    Accéder <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden />
                  </span>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Comment ça marche */}
      <section id="fonctionnement" aria-labelledby="how-title" className="flex scroll-mt-24 flex-col gap-5">
        <SectionTitle as="h2" tone="cyan">
          <span id="how-title">Comment ça marche</span>
        </SectionTitle>
        <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={step.title}>
                <Card className="flex h-full flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gradient text-4xl font-extrabold">{String(i + 1).padStart(2, "0")}</span>
                    <Icon className="size-6 text-primary-light" aria-hidden />
                  </div>
                  <p className="text-base font-bold text-white">{step.title}</p>
                  <p className="text-sm text-muted">{step.text}</p>
                </Card>
              </li>
            );
          })}
        </ol>
      </section>

      <section>
        <Card variant="hero" padding="lg" className="flex flex-col items-start gap-4 overflow-hidden sm:flex-row sm:items-center sm:justify-between">
          <div className="pointer-events-none absolute -top-20 -right-10 size-64 rounded-full bg-cyan/30 blur-3xl" aria-hidden />
          <div className="relative">
            <p className="text-xl font-bold text-white">Un certificat à contrôler ?</p>
            <p className="mt-1 text-sm text-white/80">Saisissez un identifiant, scannez un QR code ou déposez le PDF du diplôme.</p>
          </div>
          <ButtonLink href="/verifier" variant="glass" icon={ShieldCheck} className="relative bg-white/15">
            Vérifier un certificat
          </ButtonLink>
        </Card>
      </section>
    </div>
  );
}
