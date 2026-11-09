/**
 * Conversion des résultats ethers (Result) vers les types de src/types.
 * Les structs sont lues par nom de champ (ABI human-readable ou JSON compilé).
 */
import {
  type Application,
  type ApplicationStatus,
  type Center,
  type CertStatus,
  type Certificate,
  type Gym,
  type Proposal,
  type ProposalType,
  type Quote,
  type RequestStatus,
  type RewardInfo,
  type Subscription,
  type Training,
  type TrainingRequest,
} from "@/types";

/** Forme minimale d'un Result ethers : accès par index et par nom. */
type RawStruct = Record<string, unknown> & ArrayLike<unknown>;

const big = (v: unknown): bigint => BigInt(v as bigint | number | string);
const num = (v: unknown): number => Number(v as bigint | number | string);
const str = (v: unknown): string => String(v ?? "");
const bool = (v: unknown): boolean => Boolean(v);

export function toCenter(r: RawStruct): Center {
  return { name: str(r.name ?? r[0]), active: bool(r.active ?? r[1]), joinedAt: big(r.joinedAt ?? r[2]) };
}

export function toProposal(r: RawStruct): Proposal {
  return {
    pType: num(r.pType) as ProposalType,
    candidate: str(r.candidate),
    name: str(r.name),
    proposer: str(r.proposer),
    yesVotes: big(r.yesVotes),
    noVotes: big(r.noVotes),
    deadline: big(r.deadline),
    executed: bool(r.executed),
  };
}

export function toTraining(r: RawStruct): Training {
  return {
    id: big(r.id),
    center: str(r.center),
    title: str(r.title),
    price: big(r.price),
    durationDays: num(r.durationDays),
    validityDays: num(r.validityDays),
    metadataURI: str(r.metadataURI),
    active: bool(r.active),
  };
}

export function toTrainingRequest(r: RawStruct): TrainingRequest {
  return {
    id: big(r.id),
    trainingId: big(r.trainingId),
    coach: str(r.coach),
    center: str(r.center),
    amount: big(r.amount),
    status: num(r.status) as RequestStatus,
    createdAt: num(r.createdAt),
  };
}

export function toCertificate(r: RawStruct): Certificate {
  return {
    id: big(r.id),
    coach: str(r.coach),
    issuer: str(r.issuer),
    trainingId: big(r.trainingId),
    documentHash: str(r.documentHash),
    issuedAt: num(r.issuedAt),
    expiresAt: num(r.expiresAt),
    revoked: bool(r.revoked),
    revokeReason: str(r.revokeReason),
  };
}

/** Résultat de CoachCertificate.verify : (CertStatus, Certificate). */
export function toVerifyResult(r: RawStruct): { status: CertStatus; certificate: Certificate } {
  return { status: num(r[0]) as CertStatus, certificate: toCertificate(r[1] as RawStruct) };
}

export function toGym(r: RawStruct): Gym {
  return {
    id: big(r.id),
    owner: str(r.owner),
    name: str(r.name),
    monthlyFee: big(r.monthlyFee),
    affiliationFee: big(r.affiliationFee),
    metadataURI: str(r.metadataURI),
    active: bool(r.active),
  };
}

export function toApplication(r: RawStruct): Application {
  return {
    id: big(r.id),
    gymId: big(r.gymId),
    coach: str(r.coach),
    coachingPrice: big(r.coachingPrice),
    amount: big(r.amount),
    status: num(r.status) as ApplicationStatus,
    createdAt: num(r.createdAt),
  };
}

export function toSubscription(r: RawStruct): Subscription {
  return { coach: str(r.coach ?? r[0]), endTime: num(r.endTime ?? r[1]) };
}

export function toQuote(r: RawStruct): Quote {
  return { total: big(r.total ?? r[0]), gymPart: big(r.gymPart ?? r[1]), coachPart: big(r.coachPart ?? r[2]) };
}

export function toGymCoaches(r: RawStruct): { coach: string; price: bigint }[] {
  const coaches = Array.from((r.coaches ?? r[0]) as ArrayLike<unknown>).map(str);
  const prices = Array.from((r.prices ?? r[1]) as ArrayLike<unknown>).map(big);
  return coaches.map((coach, i) => ({ coach, price: prices[i] ?? 0n }));
}

export function toRewardInfo(r: RawStruct): RewardInfo {
  return {
    welcomeClaimed: bool(r.welcomeClaimed ?? r[0]),
    lastClaimDay: big(r.lastClaimDay ?? r[1]),
    streak: big(r.streak ?? r[2]),
    totalEarned: big(r.totalEarned ?? r[3]),
  };
}

/** Convertit un tableau uint256[] en bigint[]. */
export function toIds(r: ArrayLike<unknown>): bigint[] {
  return Array.from(r).map(big);
}

/** Compare deux adresses sans tenir compte de la casse. */
export function sameAddress(a: string | null | undefined, b: string | null | undefined): boolean {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
