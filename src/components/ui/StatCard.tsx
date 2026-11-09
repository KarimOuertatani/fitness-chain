import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconTile, type IconTone } from "@/components/ui/IconTile";
import { Skeleton } from "@/components/ui/Skeleton";

/** Tuile statistique (style « Activités du jour » de FitForge). */
export function StatCard({
  icon,
  tone = "violet",
  label,
  value,
  hint,
  loading,
  teal,
  className,
}: {
  icon: LucideIcon;
  tone?: IconTone;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  loading?: boolean;
  teal?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 rounded-3xl p-4 sm:p-5", teal ? "glass-teal" : "glass", className)}>
      <div className="flex items-center gap-3">
        <IconTile icon={icon} tone={tone} />
        <p className="min-w-0 truncate text-sm text-muted">{label}</p>
      </div>
      <div className="mt-3 min-w-0 truncate text-xl font-bold text-white sm:text-2xl">
        {loading ? <Skeleton className="h-7 w-24" /> : value}
      </div>
      {hint && <div className="mt-1 truncate text-xs text-subtle">{hint}</div>}
    </div>
  );
}
