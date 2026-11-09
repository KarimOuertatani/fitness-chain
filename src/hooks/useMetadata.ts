"use client";

import { fetchMetadata } from "@/lib/ipfs";
import { useAsync } from "@/hooks/useAsync";

/** Charge les métadonnées JSON (IPFS) d'une formation, salle ou certificat. */
export function useMetadata(uri: string | null | undefined) {
  const { data, loading } = useAsync(() => fetchMetadata(uri), ["metadata", uri], { enabled: !!uri });
  return { metadata: data ?? null, loading };
}
