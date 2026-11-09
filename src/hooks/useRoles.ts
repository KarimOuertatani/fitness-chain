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
  const { address } = useWallet();
  const { data, loading, error } = useContractData(
    async (provider): Promise<Roles> => {
      const dao = getContract("CenterDAO", provider);
      const certificate = getContract("CoachCertificate", provider);
      const gym = getContract("GymManager", provider);
      const [isCenter, gyms, certificates, requests, memberGyms] = await Promise.all([
        dao.isActiveCenter(address) as Promise<boolean>,
        gym.getGymsOf(address) as Promise<unknown[]>,
        certificate.getCertificatesOf(address) as Promise<unknown[]>,
        certificate.getRequestsOfCoach(address) as Promise<unknown[]>,
        gym.getMemberGyms(address) as Promise<unknown[]>,
      ]);
      return {
        center: Boolean(isCenter),
        gym: gyms.length > 0,
        coach: certificates.length > 0 || requests.length > 0,
        member: memberGyms.length > 0,
      };
    },
    ["roles", address],
    { enabled: !!address }
  );
  return { roles: data ?? NO_ROLES, loading, error };
}
