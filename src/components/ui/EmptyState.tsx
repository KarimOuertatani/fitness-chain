import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-4 py-10 text-center", className)}>
      <span className="relative inline-flex size-16 items-center justify-center rounded-3xl bg-primary/15 text-primary-light">
        <span className="absolute inset-0 rounded-3xl bg-primary/20 blur-xl" aria-hidden />
        <Icon className="relative size-7" aria-hidden />
      </span>
      <p className="text-base font-semibold text-white">{title}</p>
      {description && <div className="max-w-md text-sm text-muted">{description}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
