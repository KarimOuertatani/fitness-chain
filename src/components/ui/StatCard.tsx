import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconTile, type IconTone } from "@/components/ui/IconTile";
import { Skeleton } from "@/components/ui/Skeleton";

/** Tuile statistique : libellé, valeur en grand, précision. */
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
    <div className={cn("flex min-w-0 flex-col gap-4 rounded-3xl p-5", teal ? "glass-teal" : "glass", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-[13px] font-medium text-muted">{label}</p>
        <IconTile icon={icon} tone={tone} />
      </div>
      <div className="min-w-0">
        <div className="truncate text-2xl font-bold text-white tabular-nums">
          {loading ? <Skeleton className="h-8 w-24" /> : value}
        </div>
        {hint && <div className="mt-1 truncate text-xs text-subtle">{hint}</div>}
      </div>
    </div>
  );
}
