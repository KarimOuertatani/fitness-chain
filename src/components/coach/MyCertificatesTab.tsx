"use client";

import { QRCodeSVG } from "qrcode.react";
import { Award, ExternalLink, FileText, Landmark } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useContractData } from "@/hooks/useContractData";
import { useMetadata } from "@/hooks/useMetadata";
import { useOrigin } from "@/hooks/useOrigin";
import { getContract } from "@/lib/contracts";
import { readCenterName, readCertificatesOf, readTrainings } from "@/lib/reads";
import { formatDate } from "@/lib/format";
import { ipfsUrl } from "@/lib/ipfs";
import { cn } from "@/lib/utils";
import { CertStatus, type Certificate } from "@/types";
import { ErrorState } from "@/components/shared/ErrorState";
import { CertStatusBadge } from "@/components/shared/StatusBadges";
import { ButtonLink, Card, EmptyState, SkeletonList } from "@/components/ui";

interface CertEntry {
  status: CertStatus;
  certificate: Certificate;
  title: string;
  issuerName: string;
  tokenURI: string;
}

function CertificateCard({ entry }: { entry: CertEntry }) {
  const origin = useOrigin();
  const { metadata } = useMetadata(entry.tokenURI);
  const c = entry.certificate;
  const verifyPath = `/verifier/${c.id.toString()}`;
  const documentUrl = ipfsUrl(metadata?.document) || ipfsUrl(entry.tokenURI);
  const valid = entry.status === CertStatus.Valid;

  return (
    <Card variant={valid ? "default" : "flat"} className={cn("flex flex-col gap-5 sm:flex-row", valid && "shadow-[0_0_40px_-16px_rgba(34,197,94,0.7)]")}>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <CertStatusBadge status={entry.status} />
          <span className="text-xs text-subtle">Certificat n°{c.id.toString()} · NFT Soulbound</span>
        </div>
        <p className="text-xl font-extrabold text-white">{entry.title}</p>
        <p className="flex items-center gap-2 text-sm text-muted">
          <Landmark className="size-4" aria-hidden /> {entry.issuerName || "Centre émetteur"}
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-white/[0.04] p-3">
            <p className="text-xs text-subtle">Délivré le</p>
            <p className="font-semibold text-white">{formatDate(c.issuedAt)}</p>
          </div>
          <div className="rounded-2xl bg-white/[0.04] p-3">
            <p className="text-xs text-subtle">Expire le</p>
            <p className="font-semibold text-white">{c.expiresAt === 0 ? "Jamais" : formatDate(c.expiresAt)}</p>
          </div>
        </div>
        {c.revoked && c.revokeReason && <p className="text-sm text-danger">Motif de révocation : {c.revokeReason}</p>}
        <div className="mt-auto flex flex-wrap gap-2">
          <ButtonLink href={verifyPath} variant="glass" size="sm" icon={ExternalLink}>
            Page de vérification
          </ButtonLink>
          {documentUrl && (
            <ButtonLink href={documentUrl} external variant="glass" size="sm" icon={FileText}>
              Voir sur IPFS
            </ButtonLink>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-center justify-center gap-2">
        <div className="rounded-2xl bg-white p-3">
          {origin ? (
            <QRCodeSVG value={`${origin}${verifyPath}`} size={132} level="M" aria-label={`QR code vers ${verifyPath}`} />
          ) : (
            <div className="size-[132px]" />
          )}
        </div>
        <p className="text-xs text-subtle">Scannez pour vérifier</p>
      </div>
    </Card>
  );
}

export function MyCertificatesTab() {
  const { address } = useWallet();
  const { data, loading, error, reload } = useContractData(
    async (provider): Promise<CertEntry[]> => {
      const contract = getContract("CoachCertificate", provider);
      const results = await readCertificatesOf(provider, address as string);
      const trainingIds = [...new Set(results.map((r) => r.certificate.trainingId.toString()))].map(BigInt);
      const trainings = await readTrainings(provider, trainingIds);
      const titles = Object.fromEntries(trainings.map((t) => [t.id.toString(), t.title]));
      const issuers = [...new Set(results.map((r) => r.certificate.issuer.toLowerCase()))];
      const names = Object.fromEntries(await Promise.all(issuers.map(async (a) => [a, await readCenterName(provider, a)] as const)));
      const uris = await Promise.all(results.map((r) => (contract.tokenURI(r.id) as Promise<string>).catch(() => "")));
      return results
        .map((r, i) => ({
          status: r.status,
          certificate: r.certificate,
          title: titles[r.certificate.trainingId.toString()] ?? `Formation n°${r.certificate.trainingId.toString()}`,
          issuerName: names[r.certificate.issuer.toLowerCase()] ?? "",
          tokenURI: String(uris[i] ?? ""),
        }))
        .reverse();
    },
    ["coach-certificates", address],
    { enabled: !!address }
  );

  if (loading) return <SkeletonList count={2} />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data || data.length === 0) {
    return (
      <Card>
        <EmptyState icon={Award} title="Aucun certificat" description="Vos certificats apparaîtront ici dès qu'un centre aura validé votre formation." />
      </Card>
    );
  }
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {data.map((entry) => (
        <CertificateCard key={entry.certificate.id.toString()} entry={entry} />
      ))}
    </div>
  );
}
