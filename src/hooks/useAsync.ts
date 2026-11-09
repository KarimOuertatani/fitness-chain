"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { translateError } from "@/lib/errors";

export interface AsyncState<T> {
  data: T | undefined;
  error: string | undefined;
  /** Premier chargement pour la clé courante */
  loading: boolean;
  /** Relance le chargement */
  reload: () => void;
}

function stableKey(key: readonly unknown[]): string {
  return JSON.stringify(key, (_, v) => (typeof v === "bigint" ? `${v.toString()}n` : v));
}

/**
 * Charge une donnée asynchrone identifiée par `key`.
 * Les données de la clé courante restent affichées pendant un rafraîchissement.
 */
export function useAsync<T>(
  fetcher: () => Promise<T>,
  key: readonly unknown[],
  options: { enabled?: boolean; refreshKey?: number } = {}
): AsyncState<T> {
  const { enabled = true, refreshKey = 0 } = options;
  const keyString = stableKey(key);
  const [state, setState] = useState<{ key: string | null; data?: T; error?: string }>({ key: null });
  const [reloadCount, setReloadCount] = useState(0);
  const runFetcher = useEffectEvent(() => fetcher());

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    runFetcher().then(
      (data) => {
        if (!cancelled) setState({ key: keyString, data });
      },
      (error: unknown) => {
        if (!cancelled) setState({ key: keyString, error: translateError(error) });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [enabled, keyString, refreshKey, reloadCount]);

  const current = state.key === keyString;
  return {
    data: enabled && current ? state.data : undefined,
    error: enabled && current ? state.error : undefined,
    loading: enabled && !current,
    reload: () => setReloadCount((n) => n + 1),
  };
}
