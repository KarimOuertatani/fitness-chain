import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * default : carte principale en verre dépoli
 * teal    : variante à teinte cyan (alternance)
 * hero    : carte mise en avant (une seule par écran)
 * flat    : bloc secondaire, sans flou ni ombre
 */
export type CardVariant = "default" | "teal" | "hero" | "flat";

const VARIANTS: Record<CardVariant, string> = {
  default: "glass",
  teal: "glass-teal",
  hero: "bg-gradient-hero border border-white/10 shadow-glow-primary",
  flat: "bg-surface-2 border border-border",
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  /** Réaction au survol (cartes cliquables) */
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const PADDINGS = { none: "", sm: "p-4", md: "p-5 sm:p-6", lg: "p-6 sm:p-8" };

export function Card({ variant = "default", interactive, padding = "md", className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "relative min-w-0 rounded-3xl",
        VARIANTS[variant],
        PADDINGS[padding],
        interactive && "transition duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-card-hover",
        className
      )}
      {...rest}
    />
  );
}

/** En-tête de carte : titre, sous-titre et action alignés. */
export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex min-w-0 items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
