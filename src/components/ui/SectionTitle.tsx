import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Titre de section avec barre verticale colorée de 4 px (style FitForge). */
export function SectionTitle({
  children,
  tone = "violet",
  action,
  description,
  as: Tag = "h2",
  className,
}: {
  children: ReactNode;
  tone?: "violet" | "cyan";
  action?: ReactNode;
  description?: ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <Tag className="flex min-w-0 items-center gap-3 text-base font-semibold text-white sm:text-lg">
          <span className={cn("h-5 w-1 shrink-0 rounded-full", tone === "violet" ? "bg-primary" : "bg-cyan")} aria-hidden />
          <span className="truncate">{children}</span>
        </Tag>
        {description && <p className="mt-1 pl-4 text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
