"use client";

import { useCallback, useState } from "react";
import { IpfsNotConfiguredError, uploadFile, uploadJson } from "@/lib/ipfs";
import type { IpfsMetadata } from "@/types";

/**
 * Envoi de fichiers / métadonnées sur IPFS avec repli « sans fichier ».
 * Si /api/ipfs répond 503, `ipfsMissing` passe à true : le formulaire affiche
 * « Stockage IPFS non configuré » et l'utilisateur peut continuer avec une URI vide.
 */
export function useIpfsUpload() {
  const [ipfsMissing, setIpfsMissing] = useState(false);
  const [uploading, setUploading] = useState(false);

  /**
   * Renvoie l'URI des métadonnées, "" si l'utilisateur a choisi de continuer sans IPFS,
   * ou null si IPFS vient d'être détecté comme absent (demander confirmation).
   */
  const uploadMetadata = useCallback(
    async (params: { metadata: IpfsMetadata; image?: File | null; document?: File | null }): Promise<string | null> => {
      if (ipfsMissing) return "";
      setUploading(true);
      try {
        const meta: IpfsMetadata = { ...params.metadata };
        if (params.image) meta.image = (await uploadFile(params.image)).uri;
        if (params.document) meta.document = (await uploadFile(params.document)).uri;
        return (await uploadJson(meta)).uri;
      } catch (error) {
        if (error instanceof IpfsNotConfiguredError) {
          setIpfsMissing(true);
          return null;
        }
        throw error;
      } finally {
        setUploading(false);
      }
    },
    [ipfsMissing]
  );

  const reset = useCallback(() => setIpfsMissing(false), []);

  return { uploadMetadata, ipfsMissing, uploading, reset };
}
