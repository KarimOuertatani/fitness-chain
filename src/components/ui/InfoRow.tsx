import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Ligne libellé / valeur pour les récapitulatifs. */
export function InfoRow({ label, value, strong, className }: { label: ReactNode; value: ReactNode; strong?: boolean; className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center justify-between gap-4 py-2 text-sm", className)}>
      <span className="shrink-0 text-muted">{label}</span>
      <span className={cn("min-w-0 truncate text-right", strong ? "text-base font-bold text-white" : "text-white")}>{value}</span>
    </div>
  );
}
