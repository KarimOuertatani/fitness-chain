import { keccak256 } from "ethers";

/**
 * Calcule l'empreinte keccak256 du contenu d'un fichier, dans le navigateur.
 * Le fichier n'est jamais envoyé : seul le hash (bytes32) est utilisé on-chain.
 */
export async function hashFile(file: File | Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  return keccak256(new Uint8Array(buffer));
}
