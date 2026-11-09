import { Interface, isError } from "ethers";
import { NotDeployedError } from "@/lib/contracts";
import { IpfsNotConfiguredError } from "@/lib/ipfs";
import { formatFTC } from "@/lib/format";

/** Erreur levée quand le wallet n'est pas sur le réseau attendu. */
export class WrongNetworkError extends Error {
  constructor(expected: string) {
    super(`Mauvais réseau : connectez MetaMask au réseau ${expected}.`);
    this.name = "WrongNetworkError";
  }
}

/** Erreurs personnalisées connues (OpenZeppelin 5 + Fitness Chain) pour décoder les reverts. */
const KNOWN_ERRORS = new Interface([
  "error Error(string)",
  "error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)",
  "error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)",
  "error ERC20InvalidSender(address sender)",
  "error ERC20InvalidReceiver(address receiver)",
  "error ERC20InvalidApprover(address approver)",
  "error ERC20InvalidSpender(address spender)",
  "error ERC721NonexistentToken(uint256 tokenId)",
  "error ERC721InvalidReceiver(address receiver)",
  "error ERC721InvalidSender(address sender)",
  "error OwnableUnauthorizedAccount(address account)",
  "error OwnableInvalidOwner(address owner)",
  "error ReentrancyGuardReentrantCall()",
  "error SafeERC20FailedOperation(address token)",
  "error Soulbound()",
]);

function customErrorMessage(name: string, args: ReadonlyArray<unknown>): string | null {
  switch (name) {
    case "ERC20InsufficientBalance":
      return `Solde FTC insuffisant (disponible : ${formatFTC(args[1] as bigint)}, requis : ${formatFTC(args[2] as bigint)}).`;
    case "ERC20InsufficientAllowance":
      return "Autorisation FTC insuffisante : validez d'abord l'étape « Autoriser ».";
    case "ERC20InvalidReceiver":
    case "ERC721InvalidReceiver":
      return "Adresse de destination invalide.";
    case "ERC20InvalidSender":
    case "ERC20InvalidApprover":
    case "ERC20InvalidSpender":
      return "Adresse invalide.";
    case "ERC721NonexistentToken":
      return "Ce certificat n'existe pas.";
    case "OwnableUnauthorizedAccount":
      return "Action réservée au propriétaire du contrat.";
    case "ReentrancyGuardReentrantCall":
      return "Appel réentrant refusé.";
    case "SafeERC20FailedOperation":
      return "Le transfert de FTC a échoué.";
    case "Soulbound":
      return "Les certificats sont liés à leur titulaire (Soulbound) : ils ne peuvent pas être transférés.";
    default:
      return null;
  }
}

/** Cherche des données de revert hexadécimales dans une erreur imbriquée. */
function findRevertData(error: unknown, depth = 0): string | null {
  if (!error || typeof error !== "object" || depth > 6) return null;
  const e = error as Record<string, unknown>;
  if (typeof e.data === "string" && /^0x[0-9a-fA-F]{8,}$/.test(e.data)) return e.data;
  for (const key of ["data", "error", "info", "cause", "originalError"]) {
    const found = findRevertData(e[key], depth + 1);
    if (found) return found;
  }
  return null;
}

/** Cherche un message texte (« reverted with reason string '…' ») dans une erreur imbriquée. */
function findNestedMessage(error: unknown, depth = 0): string | null {
  if (!error || typeof error !== "object" || depth > 6) return null;
  const e = error as Record<string, unknown>;
  if (typeof e.message === "string") {
    const match = e.message.match(/reverted with reason string ['"](.+?)['"]/);
    if (match) return match[1];
    const custom = e.message.match(/reverted with custom error ['"](\w+)\(/);
    if (custom) return customErrorMessage(custom[1], []) ?? `Erreur du contrat : ${custom[1]}`;
  }
  for (const key of ["error", "info", "data", "cause", "originalError"]) {
    const found = findNestedMessage(e[key], depth + 1);
    if (found) return found;
  }
  return null;
}

function errorCode(error: unknown): unknown {
  if (!error || typeof error !== "object") return undefined;
  const e = error as { code?: unknown; info?: { error?: { code?: unknown } }; error?: { code?: unknown } };
  return e.info?.error?.code ?? e.error?.code ?? e.code;
}

/**
 * Traduit n'importe quelle erreur (revert, refus MetaMask, réseau…) en message français lisible.
 */
export function translateError(error: unknown): string {
  if (error instanceof NotDeployedError) return "Contrats non déployés sur ce réseau.";
  if (error instanceof WrongNetworkError) return error.message;
  if (error instanceof IpfsNotConfiguredError) return "Stockage IPFS non configuré.";

  // Refus de l'utilisateur dans MetaMask
  const code = errorCode(error);
  if (isError(error, "ACTION_REJECTED") || code === 4001 || code === "ACTION_REJECTED") {
    return "Opération annulée dans MetaMask.";
  }
  if (code === -32002) return "Une demande MetaMask est déjà en attente : ouvrez l'extension.";
  if (code === 4902) return "Ce réseau n'est pas encore ajouté à MetaMask.";

  if (isError(error, "INSUFFICIENT_FUNDS")) {
    return "Solde ETH insuffisant pour payer la transaction et les frais de gaz.";
  }

  // Revert avec message (require / revert "…")
  if (isError(error, "CALL_EXCEPTION")) {
    if (error.reason) return error.reason;
    if (error.revert) {
      return customErrorMessage(error.revert.name, error.revert.args) ?? `Erreur du contrat : ${error.revert.name}`;
    }
  }

  // Erreur personnalisée non décodée par l'ABI du contrat appelé (ex. erreur ERC20 remontée)
  const data = findRevertData(error);
  if (data) {
    try {
      const parsed = KNOWN_ERRORS.parseError(data);
      if (parsed) {
        if (parsed.name === "Error") return String(parsed.args[0]);
        return customErrorMessage(parsed.name, parsed.args) ?? `Erreur du contrat : ${parsed.name}`;
      }
    } catch {
      // données non reconnues
    }
  }

  const nested = findNestedMessage(error);
  if (nested) return nested;

  if (isError(error, "BAD_DATA")) {
    return "Aucun contrat trouvé à cette adresse : le nœud a peut-être redémarré, redéployez les contrats.";
  }
  if (isError(error, "NETWORK_ERROR") || isError(error, "TIMEOUT") || isError(error, "SERVER_ERROR")) {
    return "Impossible de joindre le réseau blockchain (le nœud local est-il lancé ?).";
  }

  const message =
    (error as { shortMessage?: string })?.shortMessage ?? (error instanceof Error ? error.message : String(error));

  if (/failed to fetch|ECONNREFUSED|failed to detect network|network is unreachable/i.test(message)) {
    return "Impossible de joindre le réseau blockchain (le nœud local est-il lancé ?).";
  }
  if (/nonce/i.test(message)) {
    return "Nonce invalide : dans MetaMask, effacez l'activité du compte (Paramètres › Avancé) après un redémarrage du nœud local.";
  }
  if (/user rejected|user denied/i.test(message)) return "Opération annulée dans MetaMask.";

  return message || "Une erreur inattendue est survenue.";
}
