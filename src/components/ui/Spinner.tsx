import { cn } from "@/lib/utils";

export function Spinner({ className, label = "Chargement" }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-label={label} className={cn("inline-block size-5 shrink-0", className)}>
      <span className="block size-full animate-spin rounded-full border-2 border-white/25 border-t-white" />
    </span>
  );
}
