"use client";

import { CERTIFICATE_CONTRACTS } from "@/lib/contracts";
import { ArrowLeft, ShieldQuestion } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { NotDeployedState } from "@/components/shared/NotDeployedState";
import { VerifyResultLoader } from "@/components/verifier/VerifyResultLoader";

export function VerifierIdView({ id }: { id: string }) {
  const { isAvailable } = useWallet();
  const deployed = isAvailable(CERTIFICATE_CONTRACTS);
  const valid = /^\d+$/.test(id) && BigInt(id) > 0n;

  return (
    <>
      <PageHeader title={`Certificat n°${id}`} subtitle="Résultat de la vérification on-chain." />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        {!deployed ? (
          <NotDeployedState what="ce certificat" />
        ) : valid ? (
          <VerifyResultLoader id={BigInt(id)} />
        ) : (
          <Card>
            <EmptyState icon={ShieldQuestion} title="Identifiant invalide" description="L'identifiant d'un certificat est un nombre entier supérieur à 0." />
          </Card>
        )}
        <ButtonLink href="/verifier" variant="glass" icon={ArrowLeft} className="self-center">
          Vérifier un autre certificat
        </ButtonLink>
      </div>
    </>
  );
}
