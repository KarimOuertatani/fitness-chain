/**
 * Lectures on-chain réutilisées par plusieurs pages.
 */
import type { Provider } from "ethers";
import { getContract } from "@/lib/contracts";
import {
  toApplication,
  toCenter,
  toGym,
  toGymCoaches,
  toIds,
  toTraining,
  toTrainingRequest,
  toVerifyResult,
} from "@/lib/mappers";
import { CertStatus, type Application, type CertificateResultData, type Gym, type Training, type TrainingRequest } from "@/types";

/** Nom d'un centre (CenterDAO.centers), chaîne vide si inconnu. */
export async function readCenterName(provider: Provider, center: string): Promise<string> {
  const c = toCenter(await getContract("CenterDAO", provider).centers(center));
  return c.name;
}

/** Résultat complet de vérification d'un certificat (statut, coach, centre, formation). */
export async function readCertificateResult(provider: Provider, id: bigint): Promise<CertificateResultData> {
  const certificateContract = getContract("CoachCertificate", provider);
  const { status, certificate } = toVerifyResult(await certificateContract.verify(id));
  if (status === CertStatus.NotFound) return { status, certificate: null };
  const [issuerName, training] = await Promise.all([
    readCenterName(provider, certificate.issuer).catch(() => ""),
    certificateContract
      .getTraining(certificate.trainingId)
      .then(toTraining)
      .catch(() => null),
  ]);
  return { status, certificate, issuerName, trainingTitle: training?.title };
}

export async function readTrainings(provider: Provider, ids: bigint[]): Promise<Training[]> {
  const c = getContract("CoachCertificate", provider);
  return Promise.all(ids.map(async (id) => toTraining(await c.getTraining(id))));
}

export async function readAllTrainings(provider: Provider): Promise<Training[]> {
  const c = getContract("CoachCertificate", provider);
  const count = Number(await c.getTrainingCount());
  const ids = Array.from({ length: count }, (_, i) => BigInt(i + 1));
  return readTrainings(provider, ids);
}

export async function readRequests(provider: Provider, ids: bigint[]): Promise<TrainingRequest[]> {
  const c = getContract("CoachCertificate", provider);
  return Promise.all(ids.map(async (id) => toTrainingRequest(await c.getRequest(id))));
}

export async function readCertificatesOf(provider: Provider, coach: string) {
  const c = getContract("CoachCertificate", provider);
  const ids = toIds(await c.getCertificatesOf(coach));
  return Promise.all(ids.map(async (id) => ({ ...toVerifyResult(await c.verify(id)), id })));
}

export async function readAllCertificates(provider: Provider) {
  const c = getContract("CoachCertificate", provider);
  const count = Number(await c.getCertificateCount());
  const ids = Array.from({ length: count }, (_, i) => BigInt(i + 1));
  return Promise.all(ids.map(async (id) => toVerifyResult(await c.verify(id))));
}

export async function readGym(provider: Provider, id: bigint): Promise<Gym> {
  return toGym(await getContract("GymManager", provider).getGym(id));
}

export async function readGyms(provider: Provider, ids: bigint[]): Promise<Gym[]> {
  return Promise.all(ids.map((id) => readGym(provider, id)));
}

export async function readAllGyms(provider: Provider): Promise<Gym[]> {
  const count = Number(await getContract("GymManager", provider).getGymCount());
  return readGyms(
    provider,
    Array.from({ length: count }, (_, i) => BigInt(i + 1))
  );
}

export async function readGymCoaches(provider: Provider, gymId: bigint) {
  return toGymCoaches(await getContract("GymManager", provider).getGymCoaches(gymId));
}

export async function readApplications(provider: Provider, ids: bigint[]): Promise<Application[]> {
  const c = getContract("GymManager", provider);
  return Promise.all(ids.map(async (id) => toApplication(await c.getApplication(id))));
}

