import { Ban, CheckCircle2, Clock, Hourglass, ShieldAlert, ShieldCheck, ShieldOff, ShieldQuestion, XCircle } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui";
import { ApplicationStatus, CertStatus, ProposalStatus, RequestStatus } from "@/types";
import type { LucideIcon } from "lucide-react";

type Meta = { label: string; tone: BadgeTone; icon: LucideIcon };

export const CERT_STATUS: Record<CertStatus, Meta> = {
  [CertStatus.NotFound]: { label: "Inexistant", tone: "gray", icon: ShieldQuestion },
  [CertStatus.Valid]: { label: "Valide", tone: "green", icon: ShieldCheck },
  [CertStatus.Revoked]: { label: "Révoqué", tone: "red", icon: ShieldOff },
  [CertStatus.Expired]: { label: "Expiré", tone: "yellow", icon: Hourglass },
  [CertStatus.IssuerRemoved]: { label: "Centre exclu", tone: "orange", icon: ShieldAlert },
};

export const REQUEST_STATUS: Record<RequestStatus, Meta> = {
  [RequestStatus.Pending]: { label: "En attente", tone: "yellow", icon: Clock },
  [RequestStatus.Accepted]: { label: "Acceptée", tone: "cyan", icon: CheckCircle2 },
  [RequestStatus.Rejected]: { label: "Refusée", tone: "red", icon: XCircle },
  [RequestStatus.Cancelled]: { label: "Annulée", tone: "gray", icon: Ban },
  [RequestStatus.Completed]: { label: "Validée", tone: "green", icon: ShieldCheck },
};

export const APPLICATION_STATUS: Record<ApplicationStatus, Meta> = {
  [ApplicationStatus.Pending]: { label: "En attente", tone: "yellow", icon: Clock },
  [ApplicationStatus.Accepted]: { label: "Acceptée", tone: "green", icon: CheckCircle2 },
  [ApplicationStatus.Rejected]: { label: "Refusée", tone: "red", icon: XCircle },
  [ApplicationStatus.Cancelled]: { label: "Annulée", tone: "gray", icon: Ban },
};

export const PROPOSAL_STATUS: Record<ProposalStatus, Meta> = {
  [ProposalStatus.Pending]: { label: "En cours", tone: "yellow", icon: Clock },
  [ProposalStatus.Approved]: { label: "Approuvée", tone: "cyan", icon: CheckCircle2 },
  [ProposalStatus.Rejected]: { label: "Rejetée", tone: "red", icon: XCircle },
  [ProposalStatus.Executed]: { label: "Exécutée", tone: "green", icon: ShieldCheck },
};

function MetaBadge({ meta }: { meta: Meta | undefined }) {
  if (!meta) return <Badge tone="gray">Inconnu</Badge>;
  return (
    <Badge tone={meta.tone} icon={meta.icon}>
      {meta.label}
    </Badge>
  );
}

export const CertStatusBadge = ({ status }: { status: CertStatus }) => <MetaBadge meta={CERT_STATUS[status]} />;
export const RequestStatusBadge = ({ status }: { status: RequestStatus }) => <MetaBadge meta={REQUEST_STATUS[status]} />;
export const ApplicationStatusBadge = ({ status }: { status: ApplicationStatus }) => <MetaBadge meta={APPLICATION_STATUS[status]} />;
export const ProposalStatusBadge = ({ status }: { status: ProposalStatus }) => <MetaBadge meta={PROPOSAL_STATUS[status]} />;
