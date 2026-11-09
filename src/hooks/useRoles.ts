"use client";

import { getContract } from "@/lib/contracts";
import { useWallet } from "@/hooks/useWallet";
import { useContractData } from "@/hooks/useContractData";

export interface Roles {
  center: boolean;
  gym: boolean;
  coach: boolean;
  member: boolean;
}

const NO_ROLES: Roles = { center: false, gym: false, coach: false, member: false };

/**
 * Détecte les rôles de l'adresse connectée (docs : section 5.5) :
 * Centre  → CenterDAO.isActiveCenter
 * Salle   → GymManager.getGymsOf non vide
 * Coach   → CoachCertificate.getCertificatesOf ou getRequestsOfCoach non vide
 * Adhérent → GymManager.getMemberGyms non vide
 */
export function useRoles() {
  const { address, isAvailable } = useWallet();
  // Déploiement partiel : seuls les contrats disponibles sont interrogés.
  const hasDao = isAvailable(["CenterDAO"]);
  const hasCertificate = isAvailable(["CoachCertificate"]);
  const hasGym = isAvailable(["GymManager"]);
  const { data, loading, error } = useContractData(
    async (provider): Promise<Roles> => {
      const none = Promise.resolve([] as unknown[]);
      const dao = hasDao ? getContract("CenterDAO", provider) : null;
      const certificate = hasCertificate ? getContract("CoachCertificate", provider) : null;
      const gym = hasGym ? getContract("GymManager", provider) : null;
      const [isCenter, gyms, certificates, requests, memberGyms] = await Promise.all([
        dao ? (dao.isActiveCenter(address) as Promise<boolean>) : Promise.resolve(false),
        gym ? (gym.getGymsOf(address) as Promise<unknown[]>) : none,
        certificate ? (certificate.getCertificatesOf(address) as Promise<unknown[]>) : none,
        certificate ? (certificate.getRequestsOfCoach(address) as Promise<unknown[]>) : none,
        gym ? (gym.getMemberGyms(address) as Promise<unknown[]>) : none,
      ]);
      return {
        center: Boolean(isCenter),
        gym: gyms.length > 0,
        coach: certificates.length > 0 || requests.length > 0,
        member: memberGyms.length > 0,
      };
    },
    ["roles", address, hasDao, hasCertificate, hasGym],
    { enabled: !!address && (hasDao || hasCertificate || hasGym), requires: [] }
  );
  return { roles: data ?? NO_ROLES, loading, error };
}
