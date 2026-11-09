"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Adresse raccourcie, copiable au clic. */
export function AddressText({ address, chars = 4, className }: { address: string; chars?: number; className?: string }) {
  return (
    <button
      type="button"
      title={address}
      onClick={() => void navigator.clipboard?.writeText(address).then(() => toast.success("Adresse copiée."))}
      className={cn("inline-flex max-w-full items-center gap-1.5 font-mono text-xs text-muted transition hover:text-white", className)}
    >
      <span className="truncate">{shortAddress(address, chars)}</span>
      <Copy className="size-3 shrink-0 opacity-60" aria-hidden />
      <span className="sr-only">Copier l&apos;adresse</span>
    </button>
  );
}
