"use client";

import { useState } from "react";
import { ArrowLeft, BadgeCheck, Building2, CalendarCheck, CreditCard, Minus, Plus, RefreshCw, Users } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useContractData } from "@/hooks/useContractData";
import { useMetadata } from "@/hooks/useMetadata";
import { useNow } from "@/hooks/useNow";
import { getContract, GYM_CONTRACTS } from "@/lib/contracts";
import { ZERO_ADDRESS, sameAddress, toQuote, toSubscription } from "@/lib/mappers";
import { readGym, readGymCoaches } from "@/lib/reads";
import { formatDate, formatFTC, joursRestants, shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/shared/ErrorState";
import { IpfsImage } from "@/components/shared/IpfsImage";
import { NotDeployedState } from "@/components/shared/NotDeployedState";
import { AddressText } from "@/components/shared/AddressText";
import { PaymentModal } from "@/components/wallet/PaymentModal";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { Alert, Badge, Button, ButtonLink, Card, Checkbox, EmptyState, InfoRow, SectionTitle, Skeleton, FtcAmount, FtcGlyph } from "@/components/ui";

const MIN_MONTHS = 1;
const MAX_MONTHS = 12;

export function GymDetail({ id }: { id: string }) {
  const { isAvailable, address } = useWallet();
  const deployed = isAvailable(GYM_CONTRACTS);
  const now = useNow();
  const gymId = /^\d+$/.test(id) ? BigInt(id) : 0n;

  const [months, setMonths] = useState(1);
  const [withCoach, setWithCoach] = useState(false);
  const [coach, setCoach] = useState<string>("");
  const [paying, setPaying] = useState(false);

  const { data, loading, error, reload } = useContractData(
    async (provider) => {
      // getGym rejette un identifiant inconnu : on vérifie d'abord le nombre de salles
      const count = BigInt(await getContract("GymManager", provider).getGymCount());
      if (gymId === 0n || gymId > count) return null;
      const gym = await readGym(provider, gymId);
      if (gym.id === 0n || sameAddress(gym.owner, ZERO_ADDRESS)) return null;
      const certificate = getContract("CoachCertificate", provider);
      const coaches = await readGymCoaches(provider, gymId);
      const certified = await Promise.all(coaches.map((c) => certificate.hasValidCertificate(c.coach) as Promise<boolean>));
      const subscription = address
        ? toSubscription(await getContract("GymManager", provider).getSubscription(address, gymId))
        : null;
      return {
        gym,
        coaches: coaches.map((c, i) => ({ ...c, certified: Boolean(certified[i]) })),
        subscription,
      };
    },
    ["gym-detail", gymId, address],
    { requires: GYM_CONTRACTS }
  );

  const coachAddress = withCoach && coach ? coach : ZERO_ADDRESS;
  const { data: quote } = useContractData(
    async (provider) => toQuote(await getContract("GymManager", provider).quote(gymId, coachAddress, BigInt(months))),
    ["quote", gymId, coachAddress, months],
    { enabled: !!data && (!withCoach || !!coach), requires: GYM_CONTRACTS }
  );

  const { metadata } = useMetadata(data?.gym.metadataURI);

  if (!deployed) return <NotDeployedState what="cette salle" />;
  if (loading) return <Skeleton className="h-96 rounded-3xl" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) {
    return (
      <Card>
        <EmptyState
          icon={Building2}
          title="Salle introuvable"
          description={`Aucune salle ne porte l'identifiant « ${id} ».`}
          action={
            <ButtonLink href="/salles" variant="glass" icon={ArrowLeft}>
              Retour aux salles
            </ButtonLink>
          }
        />
      </Card>
    );
  }

  const { gym, coaches, subscription } = data;
  const subscribed = !!subscription && now > 0 && subscription.endTime * 1000 > now;
  const certifiedCoaches = coaches.filter((c) => c.certified);
  const selectedCoach = coaches.find((c) => sameAddress(c.coach, coach));
  const canQuote = !withCoach || !!coach;

  return (
    <div className="flex flex-col gap-6">
      <ButtonLink href="/salles" variant="ghost" size="sm" icon={ArrowLeft} className="self-start">
        Toutes les salles
      </ButtonLink>

      <Card padding="none" className="overflow-hidden">
        <IpfsImage uri={metadata?.image} alt={gym.name} className="h-48 sm:h-64" fallbackIcon={Building2} />
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-gradient text-3xl font-extrabold">{gym.name}</h1>
            {!gym.active && <Badge tone="gray">Inactive</Badge>}
          </div>
          {metadata?.description && <p className="mt-2 text-sm whitespace-pre-line text-muted">{metadata.description}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="gold" icon={FtcGlyph}>
              {formatFTC(gym.monthlyFee)} / mois
            </Badge>
            <Badge tone="cyan" icon={Users}>
              {coaches.length} coach{coaches.length > 1 ? "s" : ""}
            </Badge>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <section className="flex min-w-0 flex-col gap-3">
          <SectionTitle tone="cyan">Coachs de la salle</SectionTitle>
          {coaches.length === 0 ? (
            <Card>
              <EmptyState icon={Users} title="Aucun coach pour le moment" description="Vous pouvez vous abonner sans coaching privé." />
            </Card>
          ) : (
            coaches.map((c) => (
              <Card key={c.coach} padding="sm" className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan/15 text-cyan" aria-hidden>
                  <Users className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <AddressText address={c.coach} chars={6} className="text-sm text-white" />
                  <p className="text-xs text-subtle">
                    <FtcAmount value={c.price} className="font-semibold text-gold" /> / mois
                  </p>
                </div>
                {c.certified ? (
                  <Badge tone="green" icon={BadgeCheck}>
                    Certifié
                  </Badge>
                ) : (
                  <Badge tone="gray">Certificat non valide</Badge>
                )}
              </Card>
            ))
          )}
        </section>

        <Card className="h-fit">
          <SectionTitle>{subscribed ? "Mon abonnement" : "S'abonner"}</SectionTitle>
          {subscribed && subscription && (
            <div className="mt-4 rounded-2xl border border-success/30 bg-success/10 p-4">
              <p className="flex items-center gap-2 font-semibold text-success">
                <CalendarCheck className="size-5" aria-hidden /> Abonnement actif
              </p>
              <p className="mt-1 text-sm text-white/80">
                Jusqu&apos;au {formatDate(subscription.endTime)} ({joursRestants(subscription.endTime, now)} j restants)
                {!sameAddress(subscription.coach, ZERO_ADDRESS) && <> · coach {shortAddress(subscription.coach)}</>}
              </p>
            </div>
          )}

          {!gym.active ? (
            <Alert tone="warning" className="mt-4">
              Cette salle n&apos;accepte plus de nouveaux abonnements.
            </Alert>
          ) : !address ? (
            <div className="mt-4 flex flex-col gap-3">
              <p className="text-sm text-muted">Connectez votre wallet pour vous abonner.</p>
              <ConnectButton fullWidth />
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              <div>
                <p className="mb-2 text-sm font-medium text-muted" id="months-label">
                  Nombre de mois
                </p>
                <div className="flex items-center gap-3" role="group" aria-labelledby="months-label">
                  <Button variant="glass" size="sm" icon={Minus} aria-label="Retirer un mois" disabled={months <= MIN_MONTHS} onClick={() => setMonths((m) => Math.max(MIN_MONTHS, m - 1))} />
                  <span className="min-w-16 text-center text-2xl font-extrabold text-white" aria-live="polite">
                    {months}
                  </span>
                  <Button variant="glass" size="sm" icon={Plus} aria-label="Ajouter un mois" disabled={months >= MAX_MONTHS} onClick={() => setMonths((m) => Math.min(MAX_MONTHS, m + 1))} />
                  <span className="text-sm text-subtle">mois (1 à 12)</span>
                </div>
              </div>

              <Checkbox
                label="Coaching privé"
                description={certifiedCoaches.length === 0 ? "Aucun coach certifié disponible." : "Ajoutez un coach certifié à votre abonnement."}
                checked={withCoach}
                disabled={certifiedCoaches.length === 0}
                onChange={(checked) => {
                  setWithCoach(checked);
                  // Présélectionne le premier coach certifié (modifiable dans la liste)
                  setCoach(checked ? (certifiedCoaches[0]?.coach ?? "") : "");
                }}
              />

              {withCoach && (
                <div className="flex flex-col gap-2" role="radiogroup" aria-label="Choix du coach">
                  <p className="text-sm font-medium text-muted">
                    {coach ? "Votre coach (cliquez pour changer) :" : "Choisissez votre coach :"}
                  </p>
                  {certifiedCoaches.map((c) => (
                    <button
                      key={c.coach}
                      type="button"
                      role="radio"
                      aria-checked={sameAddress(coach, c.coach)}
                      onClick={() => setCoach(c.coach)}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-2xl border p-3 text-left transition",
                        sameAddress(coach, c.coach) ? "border-cyan bg-cyan/10" : "border-border hover:border-border-strong"
                      )}
                    >
                      <span className="truncate font-mono text-sm text-white">{shortAddress(c.coach, 6)}</span>
                      <span className="shrink-0 text-sm font-semibold text-gold">
                        <FtcAmount value={c.price} /> / mois
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="rounded-2xl bg-white/[0.04] px-4 py-2">
                <InfoRow label={`Salle (${formatFTC(gym.monthlyFee)} × ${months})`} value={formatFTC(quote?.gymPart ?? gym.monthlyFee * BigInt(months))} />
                {withCoach && <InfoRow label={`Coach (${formatFTC(selectedCoach?.price ?? null)} × ${months})`} value={quote && coach ? formatFTC(quote.coachPart) : "—"} />}
                <div className="mt-1 border-t border-border pt-1">
                  <InfoRow
                    label="Total"
                    strong
                    value={canQuote && quote ? <FtcAmount value={quote.total} className="text-gold" /> : <span className="text-gold">{canQuote ? "…" : "—"}</span>}
                  />
                </div>
              </div>

              <Button
                icon={subscribed ? RefreshCw : CreditCard}
                disabled={!canQuote || !quote}
                onClick={() => setPaying(true)}
                fullWidth
              >
                {subscribed ? "Renouveler" : "Payer"}
              </Button>
            </div>
          )}
        </Card>
      </div>

      {paying && quote && (
        <PaymentModal
          open
          onClose={() => setPaying(false)}
          title={subscribed ? `Renouveler chez ${gym.name}` : `S'abonner à ${gym.name}`}
          description={subscribed ? "La durée s'ajoute à la fin de votre abonnement actuel." : undefined}
          amount={quote.total}
          spender="GymManager"
          lines={[
            { label: "Durée", value: `${months} mois` },
            { label: "Part salle", value: formatFTC(quote.gymPart) },
            ...(withCoach ? [{ label: "Part coach", value: formatFTC(quote.coachPart) }] : []),
          ]}
          successMessage="Abonnement confirmé. Pensez à réclamer vos récompenses !"
          onPay={(signer) => getContract("GymManager", signer).subscribe(gymId, coachAddress, BigInt(months))}
        />
      )}
    </div>
  );
}
