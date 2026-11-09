"use client";

import { useContractData } from "@/hooks/useContractData";
import { readCertificateResult } from "@/lib/reads";
import { CertificateResult } from "@/components/shared/CertificateResult";
import { ErrorState } from "@/components/shared/ErrorState";
import { Skeleton } from "@/components/ui";

/** Charge et affiche le résultat de vérification d'un certificat par ID. */
export function VerifyResultLoader({ id }: { id: bigint }) {
  const { data, loading, error, reload } = useContractData((p) => readCertificateResult(p, id), ["verify", id]);
  if (loading) return <Skeleton className="h-80 rounded-3xl" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;
  return <CertificateResult result={data} />;
}
