import { cn } from "@/lib/utils";

/** Bloc de chargement. Rendu en <span> (affiché en bloc) pour rester valide dans un <p>. */
export function Skeleton({ className }: { className?: string }) {
  return <span className={cn("block animate-pulse rounded-2xl bg-white/[0.07]", className)} aria-hidden />;
}

/** Liste de cartes squelettes pendant le chargement. */
export function SkeletonList({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4", className)} role="status" aria-label="Chargement">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-28 rounded-3xl" />
      ))}
    </div>
  );
}
