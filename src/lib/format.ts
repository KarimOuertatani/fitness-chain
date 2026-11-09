import { formatUnits, parseUnits } from "ethers";

export const FTC_DECIMALS = 18;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Formate un montant FTC (bigint, 18 décimales) pour l'affichage.
 * Ex. 1234500000000000000000n → « 1 234,5 FTC »
 */
export function formatFTC(
  value: bigint | null | undefined,
  options: { decimals?: number; withSymbol?: boolean } = {}
): string {
  const { decimals = 2, withSymbol = true } = options;
  const suffix = withSymbol ? " FTC" : "";
  if (value == null) return `—${suffix}`;

  const negative = value < 0n;
  const abs = negative ? -value : value;
  const [intPart, fracPart = ""] = formatUnits(abs, FTC_DECIMALS).split(".");
  const intFormatted = BigInt(intPart).toLocaleString("fr-FR");
  const frac = fracPart.slice(0, decimals).replace(/0+$/, "");
  return `${negative ? "-" : ""}${intFormatted}${frac ? `,${frac}` : ""}${suffix}`;
}

/** Formate un montant d'ETH (wei) pour l'affichage. */
export function formatETH(value: bigint | null | undefined, decimals = 4): string {
  if (value == null) return "— ETH";
  const [intPart, fracPart = ""] = formatUnits(value, 18).split(".");
  const frac = fracPart.slice(0, decimals).replace(/0+$/, "");
  return `${BigInt(intPart).toLocaleString("fr-FR")}${frac ? `,${frac}` : ""} ETH`;
}

/** Nettoie une saisie numérique française (virgule, espaces). */
function normalizeDecimal(input: string): string {
  return input.trim().replace(/\s/g, "").replace(",", ".");
}

/**
 * Convertit une saisie utilisateur en FTC (bigint, 18 décimales).
 * Lève une erreur en français si la saisie est invalide.
 */
export function parseFTC(input: string): bigint {
  const value = normalizeDecimal(input);
  if (!/^\d+(\.\d{0,18})?$/.test(value)) {
    throw new Error("Montant FTC invalide.");
  }
  return parseUnits(value, FTC_DECIMALS);
}

/** Variante sans exception : renvoie null si la saisie est invalide. */
export function tryParseFTC(input: string): bigint | null {
  try {
    return parseFTC(input);
  } catch {
    return null;
  }
}

/** Convertit une saisie en ETH (wei) ; null si invalide. */
export function tryParseETH(input: string): bigint | null {
  const value = normalizeDecimal(input);
  if (!/^\d+(\.\d{0,18})?$/.test(value)) return null;
  try {
    return parseUnits(value, 18);
  } catch {
    return null;
  }
}

/** Raccourcit une adresse : 0x1234…abcd */
export function shortAddress(address: string | null | undefined, chars = 4): string {
  if (!address) return "";
  if (address.length <= 2 + chars * 2) return address;
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

/** Convertit un timestamp blockchain (secondes) en millisecondes. */
function toMs(seconds: bigint | number): number {
  return Number(seconds) * 1000;
}

/** Date lisible en français à partir d'un timestamp en secondes. */
export function formatDate(seconds: bigint | number | null | undefined, withTime = false): string {
  if (seconds == null || Number(seconds) === 0) return "—";
  return new Date(toMs(seconds)).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/**
 * Nombre de jours restants avant `endSeconds` (arrondi au jour supérieur, minimum 0).
 * `nowMs` est fourni par l'appelant pour garder les composants purs.
 */
export function joursRestants(endSeconds: bigint | number, nowMs: number): number {
  const diff = toMs(endSeconds) - nowMs;
  return diff <= 0 ? 0 : Math.ceil(diff / DAY_MS);
}

/** Durée lisible (« 2 j 03 h 12 min », « 4 min 05 s ») à partir de millisecondes. */
export function formatDuration(ms: number): string {
  if (ms <= 0) return "0 s";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (days > 0) return `${days} j ${pad(hours)} h ${pad(minutes)} min`;
  if (hours > 0) return `${hours} h ${pad(minutes)} min`;
  if (minutes > 0) return `${minutes} min ${pad(secs)} s`;
  return `${secs} s`;
}

/** « 1 jour », « 30 jours » */
export function pluralDays(days: number): string {
  return `${days} jour${days > 1 ? "s" : ""}`;
}
