"use client";

import { CalendarCheck, Flame, Gift, PartyPopper, Sparkles, Trophy, Zap } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useTx } from "@/hooks/useTx";
import { useContractData } from "@/hooks/useContractData";
import { useNow } from "@/hooks/useNow";
import { getContract } from "@/lib/contracts";
import { toRewardInfo } from "@/lib/mappers";
import { formatDuration, formatFTC } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/shared/ErrorState";
import { NotDeployedState } from "@/components/shared/NotDeployedState";
import { RequireWallet } from "@/components/wallet/RequireWallet";
import { Alert, Button, ButtonLink, Card, PageHeader, SectionTitle, Skeleton, StatCard } from "@/components/ui";

function StreakDots({ streak, length }: { streak: number; length: number }) {
  const filled = streak === 0 ? 0 : ((streak - 1) % length) + 1;
  return (
    <ol className="flex items-center justify-between gap-2" aria-label={`Série : ${filled} sur ${length}`}>
      {Array.from({ length }, (_, i) => {
        const done = i < filled;
        const last = i === length - 1;
        return (
          <li key={i} className="flex flex-1 flex-col items-center gap-2">
            <span
              className={cn(
                "flex aspect-square w-full max-w-14 items-center justify-center rounded-full border-2 text-sm font-bold transition",
                done
                  ? last
                    ? "border-gold bg-gold/25 text-gold shadow-[0_0_18px_rgba(245,184,61,0.8)]"
                    : "border-cyan bg-gradient-progress text-white shadow-[0_0_14px_rgba(15,221,252,0.7)]"
                  : "border-white/15 bg-white/[0.04] text-subtle"
              )}
            >
              {last ? <Gift className="size-5" aria-hidden /> : i + 1}
            </span>
            <span className="text-[11px] text-subtle">J{i + 1}</span>
          </li>
        );
      })}
    </ol>
  );
}

function RewardsContent() {
  const { address, canWrite, deployed } = useWallet();
  const { run, pending } = useTx();
  const now = useNow();

  const { data, loading, error, reload } = useContractData(
    async (provider) => {
      const rewards = getContract("RewardManager", provider);
      const gyms = getContract("GymManager", provider);
      const [info, canClaim, streak, next, member, welcome, daily, bonus, length] = await Promise.all([
        rewards.getRewardInfo(address),
        rewards.canClaimToday(address),
        rewards.getStreak(address),
        rewards.nextClaimTime(address),
        gyms.isActiveMember(address),
        rewards.welcomeBonus(),
        rewards.dailyReward(),
        rewards.streakBonus(),
        rewards.streakLength(),
      ]);
      return {
        info: toRewardInfo(info),
        canClaim: Boolean(canClaim),
        streak: Number(streak),
        nextClaimTime: Number(next),
        member: Boolean(member),
        welcomeBonus: BigInt(welcome),
        dailyReward: BigInt(daily),
        streakBonus: BigInt(bonus),
        streakLength: Number(length) || 7,
      };
    },
    ["rewards", address],
    { enabled: !!address }
  );

  if (!deployed) return <NotDeployedState what="vos récompenses" />;
  if (loading) return <Skeleton className="h-96 rounded-3xl" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const remainingMs = data.nextClaimTime * 1000 - now;
  const waiting = !data.canClaim && data.nextClaimTime > 0 && now > 0 && remainingMs > 0;
  const nextIsBonus = (data.streak % data.streakLength) + 1 === data.streakLength || (data.streak === 0 && data.streakLength === 1);

  const claimDaily = () =>
    run((signer) => getContract("RewardManager", signer).claimDaily(), {
      success: nextIsBonus
        ? `Série complète ! ${formatFTC(data.dailyReward + data.streakBonus)} reçus.`
        : `${formatFTC(data.dailyReward)} reçus. À demain !`,
    });
  const claimWelcome = () =>
    run((signer) => getContract("RewardManager", signer).claimWelcomeBonus(), {
      success: `Bienvenue ! ${formatFTC(data.welcomeBonus)} reçus.`,
    });

  return (
    <div className="flex flex-col gap-6">
      {!data.member && (
        <Alert
          tone="warning"
          title="Aucun abonnement actif"
          action={
            <ButtonLink href="/salles" variant="glass" size="sm">
              Trouver une salle
            </ButtonLink>
          }
        >
          Les récompenses sont réservées aux adhérents ayant un abonnement en cours.
        </Alert>
      )}

      <Card variant="hero" padding="lg" className="overflow-hidden">
        <div className="pointer-events-none absolute -top-20 -right-16 size-72 rounded-full bg-cyan/30 blur-3xl" aria-hidden />
        <div className="relative flex flex-col items-center gap-5 text-center">
          <span className="flex size-16 items-center justify-center rounded-3xl bg-white/15" aria-hidden>
            <Zap className="size-8 fill-white text-white" />
          </span>
          <div>
            <p className="text-sm font-medium text-white/80">Récompense quotidienne</p>
            <p className="mt-1 text-4xl font-extrabold text-white">+{formatFTC(data.dailyReward)}</p>
            <p className="mt-1 text-sm text-white/75">
              +{formatFTC(data.streakBonus)} de bonus tous les {data.streakLength} jours consécutifs
            </p>
          </div>
          <Button
            size="lg"
            variant="glass"
            icon={data.canClaim ? Sparkles : CalendarCheck}
            loading={pending}
            disabled={!canWrite || !data.member || !data.canClaim}
            onClick={() => void claimDaily()}
            className="w-full max-w-sm bg-white/20 hover:bg-white/30"
          >
            {data.canClaim ? "Réclamer ma récompense du jour" : "Déjà réclamée aujourd'hui"}
          </Button>
          {waiting && (
            <p className="text-sm text-white/85" aria-live="polite">
              Prochaine récompense dans <span className="font-bold">{formatDuration(remainingMs)}</span>
            </p>
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle
          tone="cyan"
          action={
            <span className="flex items-center gap-1.5 text-sm font-semibold text-orange">
              <Flame className="size-4" aria-hidden /> {data.streak} jour{data.streak > 1 ? "s" : ""}
            </span>
          }
        >
          Série de la semaine
        </SectionTitle>
        <div className="mt-5">
          <StreakDots streak={data.streak} length={data.streakLength} />
        </div>
        <p className="mt-4 text-center text-sm text-muted">
          {data.streak === 0
            ? "Réclamez chaque jour pour démarrer une série."
            : "Revenez demain pour continuer votre série : un jour manqué la remet à zéro."}
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card variant="teal" className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-gold/15 text-gold" aria-hidden>
              <PartyPopper className="size-6" />
            </span>
            <div>
              <p className="font-bold text-white">Bonus de bienvenue</p>
              <p className="text-sm text-muted">Une seule fois par adhérent</p>
            </div>
          </div>
          <p className="text-3xl font-extrabold text-gold">{formatFTC(data.welcomeBonus)}</p>
          {data.info.welcomeClaimed ? (
            <p className="text-sm font-semibold text-success">✓ Déjà réclamé</p>
          ) : (
            <Button variant="secondary" icon={Gift} loading={pending} disabled={!canWrite || !data.member} onClick={() => void claimWelcome()}>
              Réclamer mon bonus
            </Button>
          )}
        </Card>
        <StatCard
          icon={Trophy}
          tone="gold"
          label="Total gagné"
          value={<span className="text-3xl text-gold">{formatFTC(data.info.totalEarned)}</span>}
          hint="Bonus de bienvenue, récompenses quotidiennes et bonus de série"
        />
      </div>
    </div>
  );
}

export function RewardsView() {
  return (
    <>
      <PageHeader title="Récompenses" subtitle="Gagnez des FitCoins chaque jour grâce à votre abonnement." />
      <RequireWallet message="Connectez MetaMask pour réclamer vos récompenses.">
        <RewardsContent />
      </RequireWallet>
    </>
  );
}
