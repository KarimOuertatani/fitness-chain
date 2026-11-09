import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Titre de section avec barre verticale colorée de 4 px (style FitForge). */
export function SectionTitle({
  children,
  tone = "violet",
  action,
  as: Tag = "h2",
  className,
}: {
  children: ReactNode;
  tone?: "violet" | "cyan";
  action?: ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center justify-between gap-3", className)}>
      <Tag className="flex min-w-0 items-center gap-3 text-lg font-bold text-white">
        <span
          className={cn(
            "h-6 w-1 shrink-0 rounded-full",
            tone === "violet" ? "bg-primary shadow-[0_0_12px_rgba(124,58,237,0.9)]" : "bg-cyan shadow-[0_0_12px_rgba(34,211,238,0.9)]"
          )}
          aria-hidden
        />
        <span className="truncate">{children}</span>
      </Tag>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
