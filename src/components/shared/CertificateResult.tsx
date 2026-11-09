"use client";

import { CalendarCheck, CalendarX, FileText, GraduationCap, Hash, Landmark, User } from "lucide-react";
import type { ReactNode } from "react";
import { CertStatus, type CertificateResultData } from "@/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CERT_STATUS } from "@/components/shared/StatusBadges";
import { AddressText } from "@/components/shared/AddressText";

const STATUS_STYLES: Record<CertStatus, { card: string; icon: string; text: string }> = {
  [CertStatus.Valid]: { card: "border-success/40 bg-success/10 shadow-[0_0_40px_-12px_rgba(34,197,94,0.6)]", icon: "bg-success/20 text-success", text: "text-success" },
  [CertStatus.Revoked]: { card: "border-danger/40 bg-danger/10 shadow-[0_0_40px_-12px_rgba(239,68,68,0.6)]", icon: "bg-danger/20 text-danger", text: "text-danger" },
  [CertStatus.Expired]: { card: "border-warning/40 bg-warning/10 shadow-[0_0_40px_-12px_rgba(234,179,8,0.6)]", icon: "bg-warning/20 text-warning", text: "text-warning" },
  [CertStatus.IssuerRemoved]: { card: "border-orange/40 bg-orange/10 shadow-[0_0_40px_-12px_rgba(249,115,22,0.6)]", icon: "bg-orange/20 text-orange", text: "text-orange" },
  [CertStatus.NotFound]: { card: "border-white/15 bg-white/[0.04]", icon: "bg-white/10 text-muted", text: "text-muted" },
};

const STATUS_TEXT: Record<CertStatus, string> = {
  [CertStatus.Valid]: "Ce certificat est authentique et en cours de validité.",
  [CertStatus.Revoked]: "Ce certificat a été révoqué par le centre émetteur.",
  [CertStatus.Expired]: "Ce certificat a dépassé sa date de validité.",
  [CertStatus.IssuerRemoved]: "Le centre émetteur a été exclu de la DAO : ce certificat n'est plus garanti.",
  [CertStatus.NotFound]: "Aucun certificat ne correspond à cette recherche.",
};

function Detail({ icon: Icon, label, children }: { icon: typeof User; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl bg-white/[0.04] p-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs text-subtle">{label}</p>
        <div className="truncate text-sm font-medium text-white">{children}</div>
      </div>
    </div>
  );
}

/** Grande carte colorée selon le statut d'un certificat. */
export function CertificateResult({ result }: { result: CertificateResultData }) {
  const { status, certificate, issuerName, trainingTitle } = result;
  const meta = CERT_STATUS[status];
  const styles = STATUS_STYLES[status];
  const Icon = meta.icon;
  const found = status !== CertStatus.NotFound && certificate;

  return (
    <div className={cn("rounded-3xl border p-5 backdrop-blur-xl sm:p-8", styles.card)} aria-live="polite">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className={cn("flex size-16 items-center justify-center rounded-3xl", styles.icon)}>
          <Icon className="size-8" aria-hidden />
        </span>
        <p className={cn("text-2xl font-extrabold sm:text-3xl", styles.text)}>{meta.label}</p>
        <p className="max-w-md text-sm text-white/80">{STATUS_TEXT[status]}</p>
        {status === CertStatus.Revoked && certificate?.revokeReason && (
          <p className="max-w-md rounded-2xl bg-danger/15 px-4 py-2 text-sm text-white">Motif : {certificate.revokeReason}</p>
        )}
      </div>

      {found && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Detail icon={Hash} label="Certificat">
            n°{certificate.id.toString()}
          </Detail>
          <Detail icon={GraduationCap} label="Formation">
            {trainingTitle || `Formation n°${certificate.trainingId.toString()}`}
          </Detail>
          <Detail icon={User} label="Coach">
            <AddressText address={certificate.coach} chars={6} className="text-sm text-white" />
          </Detail>
          <Detail icon={Landmark} label="Centre émetteur">
            {issuerName ? (
              <span>
                {issuerName} <AddressText address={certificate.issuer} className="ml-1" />
              </span>
            ) : (
              <AddressText address={certificate.issuer} chars={6} className="text-sm text-white" />
            )}
          </Detail>
          <Detail icon={CalendarCheck} label="Délivré le">
            {formatDate(certificate.issuedAt)}
          </Detail>
          <Detail icon={CalendarX} label="Expire le">
            {certificate.expiresAt === 0 ? "Sans expiration" : formatDate(certificate.expiresAt)}
          </Detail>
          <div className="sm:col-span-2">
            <Detail icon={FileText} label="Empreinte du document (keccak256)">
              <span className="font-mono text-xs">{certificate.documentHash}</span>
            </Detail>
          </div>
        </div>
      )}
    </div>
  );
}
