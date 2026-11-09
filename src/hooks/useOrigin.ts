"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Origine du site (https://…) côté client, chaîne vide côté serveur. */
export function useOrigin(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.origin,
    () => ""
  );
}
