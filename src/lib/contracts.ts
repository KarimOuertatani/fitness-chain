import { Contract, JsonRpcProvider, type ContractRunner, type InterfaceAbi } from "ethers";
import addressesJson from "@/config/addresses.json";
import { TARGET_CHAIN_ID, getNetwork } from "@/config/networks";
import { fitCoinAbi } from "@/lib/abi/fitCoin";
import { centerDaoAbi } from "@/lib/abi/centerDao";
import { coachCertificateAbi } from "@/lib/abi/coachCertificate";
import { gymManagerAbi } from "@/lib/abi/gymManager";
import { rewardManagerAbi } from "@/lib/abi/rewardManager";

export const CONTRACT_NAMES = ["FitCoin", "CenterDAO", "CoachCertificate", "GymManager", "RewardManager"] as const;
export type ContractName = (typeof CONTRACT_NAMES)[number];

/** Contrats nécessaires aux formations et certificats (espaces centre, coach, page Vérifier). */
export const CERTIFICATE_CONTRACTS: readonly ContractName[] = ["FitCoin", "CenterDAO", "CoachCertificate"];

type AddressBook = Partial<Record<ContractName, string>>;

/** addresses.json : { "31337": { "FitCoin": "0x…", … }, "11155111": { … } } — rempli par deploy.js */
const ADDRESSES = addressesJson as Record<string, AddressBook | undefined>;

/** ABI human-readable écrits d'après docs/SPEC.md. */
const HUMAN_READABLE_ABIS: Record<ContractName, InterfaceAbi> = {
  FitCoin: [...fitCoinAbi],
  CenterDAO: [...centerDaoAbi],
  CoachCertificate: [...coachCertificateAbi],
  GymManager: [...gymManagerAbi],
  RewardManager: [...rewardManagerAbi],
};

/**
 * ABI JSON compilés copiés par deploy.js dans config/abis/<Nom>.json.
 * Prioritaires s'ils existent ; sinon les ABI human-readable sont utilisés.
 * `require.context` accepte un dossier sans fichier JSON (cas initial).
 */
const jsonAbis: Partial<Record<ContractName, InterfaceAbi>> = (() => {
  const result: Partial<Record<ContractName, InterfaceAbi>> = {};
  const context = require.context("../config/abis", false, /\.json$/);
  for (const key of context.keys()) {
    const name = key.replace(/^.*\//, "").replace(/\.json$/, "") as ContractName;
    if (!CONTRACT_NAMES.includes(name)) continue;
    const mod = context(key) as { default?: unknown } | unknown[];
    const abi = Array.isArray(mod) ? mod : (mod as { default?: unknown }).default;
    if (Array.isArray(abi) && abi.length > 0) {
      result[name] = abi as InterfaceAbi;
    }
  }
  return result;
})();

/** Indique si l'ABI utilisé provient du JSON compilé. */
export function usesCompiledAbi(name: ContractName): boolean {
  return name in jsonAbis;
}

export function getAbi(name: ContractName): InterfaceAbi {
  return jsonAbis[name] ?? HUMAN_READABLE_ABIS[name];
}

/** Erreur levée quand un contrat n'a pas d'adresse pour le réseau demandé. */
export class NotDeployedError extends Error {
  constructor(name: ContractName, chainId: number) {
    super(`Contrat ${name} non déployé sur le réseau ${chainId}.`);
    this.name = "NotDeployedError";
  }
}

export function getAddresses(chainId: number = TARGET_CHAIN_ID): AddressBook {
  return ADDRESSES[String(chainId)] ?? {};
}

export function getContractAddress(name: ContractName, chainId: number = TARGET_CHAIN_ID): string | null {
  return getAddresses(chainId)[name] ?? null;
}

/** true si les 5 contrats ont une adresse pour ce réseau. */
export function isDeployed(chainId: number = TARGET_CHAIN_ID): boolean {
  const book = getAddresses(chainId);
  return CONTRACT_NAMES.every((name) => typeof book[name] === "string" && book[name]!.length > 0);
}

/** Contrats ayant une adresse pour ce réseau (déploiement partiel possible). */
export function getDeployedContracts(chainId: number = TARGET_CHAIN_ID): ContractName[] {
  const book = getAddresses(chainId);
  return CONTRACT_NAMES.filter((name) => typeof book[name] === "string" && book[name]!.length > 0);
}

/**
 * Instancie un contrat Fitness Chain.
 * - Lectures : passer le provider de lecture (getReadProvider()).
 * - Écritures : passer le signer MetaMask.
 */
export function getContract(
  name: ContractName,
  signerOrProvider: ContractRunner,
  chainId: number = TARGET_CHAIN_ID
): Contract {
  const address = getContractAddress(name, chainId);
  if (!address) throw new NotDeployedError(name, chainId);
  return new Contract(address, getAbi(name), signerOrProvider);
}

/* --------------------------------------------------------------------------
   Provider de lecture (fonctionne sans wallet)
   -------------------------------------------------------------------------- */

const readProviders = new Map<number, JsonRpcProvider>();

/**
 * Provider JSON-RPC pour les lectures (aucun wallet requis).
 * Renvoie null si aucune URL RPC n'est configurée pour ce réseau.
 */
export function getReadProvider(chainId: number = TARGET_CHAIN_ID): JsonRpcProvider | null {
  const network = getNetwork(chainId);
  if (!network || !network.rpcUrl) return null;
  let provider = readProviders.get(chainId);
  if (!provider) {
    provider = new JsonRpcProvider(network.rpcUrl, chainId, { staticNetwork: true });
    readProviders.set(chainId, provider);
  }
  return provider;
}
