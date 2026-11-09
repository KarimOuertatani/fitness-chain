/**
 * Types TypeScript reflétant les enums et structs de docs/SPEC.md (section 9).
 * Conventions : uint256 → bigint ; uint8 (enum) / uint32 / uint64 → number.
 */

/* ------------------------------------------------------------------ CenterDAO */

export enum ProposalType {
  Add = 0,
  Remove = 1,
}

export enum ProposalStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  Executed = 3,
}

export interface Center {
  name: string;
  active: boolean;
  joinedAt: bigint;
}

export interface Proposal {
  pType: ProposalType;
  candidate: string;
  name: string;
  proposer: string;
  yesVotes: bigint;
  noVotes: bigint;
  deadline: bigint;
  executed: boolean;
}

/* ----------------------------------------------------------- CoachCertificate */

export enum RequestStatus {
  Pending = 0,
  Accepted = 1,
  Rejected = 2,
  Cancelled = 3,
  Completed = 4,
}

export enum CertStatus {
  NotFound = 0,
  Valid = 1,
  Revoked = 2,
  Expired = 3,
  IssuerRemoved = 4,
}

export interface Training {
  id: bigint;
  center: string;
  title: string;
  price: bigint;
  durationDays: number;
  /** 0 → pas d'expiration */
  validityDays: number;
  metadataURI: string;
  active: boolean;
}

export interface TrainingRequest {
  id: bigint;
  trainingId: bigint;
  coach: string;
  center: string;
  amount: bigint;
  status: RequestStatus;
  createdAt: number;
}

export interface Certificate {
  id: bigint;
  coach: string;
  issuer: string;
  trainingId: bigint;
  documentHash: string;
  issuedAt: number;
  /** 0 → pas d'expiration */
  expiresAt: number;
  revoked: boolean;
  revokeReason: string;
}

/* ----------------------------------------------------------------- GymManager */

export enum ApplicationStatus {
  Pending = 0,
  Accepted = 1,
  Rejected = 2,
  Cancelled = 3,
}

export interface Gym {
  id: bigint;
  owner: string;
  name: string;
  monthlyFee: bigint;
  affiliationFee: bigint;
  metadataURI: string;
  active: boolean;
}

export interface Application {
  id: bigint;
  gymId: bigint;
  coach: string;
  coachingPrice: bigint;
  amount: bigint;
  status: ApplicationStatus;
  createdAt: number;
}

export interface Subscription {
  coach: string;
  endTime: number;
}

export interface Quote {
  total: bigint;
  gymPart: bigint;
  coachPart: bigint;
}

/* -------------------------------------------------------------- RewardManager */

export interface RewardInfo {
  welcomeClaimed: boolean;
  lastClaimDay: bigint;
  streak: bigint;
  totalEarned: bigint;
}

/* --------------------------------------------------------- Métadonnées IPFS */

/** Contenu JSON stocké sur IPFS pour une formation, une salle ou un certificat. */
export interface IpfsMetadata {
  name?: string;
  description?: string;
  /** URI de l'image (ipfs://… ou https://…) */
  image?: string;
  /** URI du document (PDF du diplôme) */
  document?: string;
}

/* ------------------------------------------------------------- Vérification */

/** Résultat affiché par la page Vérifier. */
export interface CertificateResultData {
  status: CertStatus;
  certificate: Certificate | null;
  issuerName?: string;
  trainingTitle?: string;
}
