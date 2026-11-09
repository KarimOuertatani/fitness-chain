import type { IpfsMetadata } from "@/types";

const DEFAULT_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

export const IPFS_GATEWAY = (() => {
  const gw = process.env.NEXT_PUBLIC_PINATA_GATEWAY || DEFAULT_GATEWAY;
  return gw.endsWith("/") ? gw : `${gw}/`;
})();

/** Erreur levée quand la route /api/ipfs n'a pas de PINATA_JWT (HTTP 503). */
export class IpfsNotConfiguredError extends Error {
  constructor() {
    super("Stockage IPFS non configuré");
    this.name = "IpfsNotConfiguredError";
  }
}

export interface UploadResult {
  cid: string;
  /** URI à stocker on-chain : ipfs://<cid> */
  uri: string;
  /** URL HTTP via la passerelle */
  url: string;
}

/** Envoie un fichier sur IPFS via la route serveur /api/ipfs (la clé Pinata reste côté serveur). */
export async function uploadFile(file: File | Blob, fileName?: string): Promise<UploadResult> {
  const body = new FormData();
  body.append("file", file, fileName ?? (file instanceof File ? file.name : "fichier"));

  const response = await fetch("/api/ipfs", { method: "POST", body });
  if (response.status === 503) {
    throw new IpfsNotConfiguredError();
  }
  const data = (await response.json().catch(() => null)) as { cid?: string; url?: string; error?: string } | null;
  if (!response.ok || !data?.cid) {
    throw new Error(data?.error || "Échec de l'envoi du fichier sur IPFS.");
  }
  return { cid: data.cid, uri: `ipfs://${data.cid}`, url: data.url ?? ipfsUrl(data.cid) };
}

/** Envoie un objet JSON de métadonnées sur IPFS. */
export async function uploadJson(metadata: IpfsMetadata, fileName = "metadata.json"): Promise<UploadResult> {
  const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" });
  return uploadFile(blob, fileName);
}

/**
 * Convertit un CID ou une URI (ipfs://…, https://…) en URL HTTP affichable.
 * Renvoie une chaîne vide si l'entrée est vide.
 */
export function ipfsUrl(cidOrUri: string | null | undefined): string {
  if (!cidOrUri) return "";
  const value = cidOrUri.trim();
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) {
    return value;
  }
  const cid = value.replace(/^ipfs:\/\//, "").replace(/^ipfs\//, "");
  return `${IPFS_GATEWAY}${cid}`;
}

/** Récupère les métadonnées JSON pointées par une URI ; null si absentes ou illisibles. */
export async function fetchMetadata(uri: string | null | undefined): Promise<IpfsMetadata | null> {
  const url = ipfsUrl(uri);
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("json") && !contentType.includes("text")) return null;
    const data = (await response.json()) as unknown;
    return data && typeof data === "object" ? (data as IpfsMetadata) : null;
  } catch {
    return null;
  }
}

/**
 * Envoie une image facultative puis un JSON de métadonnées.
 * Si IPFS n'est pas configuré, renvoie une URI vide (démonstration locale) et `ipfsConfigured: false`.
 */
export async function uploadMetadataWithImage(params: {
  name: string;
  description: string;
  image?: File | null;
  extra?: Partial<IpfsMetadata>;
}): Promise<{ uri: string; ipfsConfigured: boolean }> {
  try {
    let imageUri: string | undefined;
    if (params.image) {
      imageUri = (await uploadFile(params.image)).uri;
    }
    const meta: IpfsMetadata = {
      name: params.name,
      description: params.description,
      ...(imageUri ? { image: imageUri } : {}),
      ...params.extra,
    };
    const { uri } = await uploadJson(meta);
    return { uri, ipfsConfigured: true };
  } catch (error) {
    if (error instanceof IpfsNotConfiguredError) {
      return { uri: "", ipfsConfigured: false };
    }
    throw error;
  }
}
