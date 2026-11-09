import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type CardVariant = "default" | "teal" | "hero" | "flat";

const VARIANTS: Record<CardVariant, string> = {
  default: "glass",
  teal: "glass-teal",
  hero: "bg-gradient-hero border border-white/10 shadow-glow-primary",
  flat: "bg-white/[0.03] border border-border",
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  /** Lueur au survol */
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
        interactive && "transition duration-300 hover:-translate-y-0.5 hover:shadow-card-hover",
        className
      )}
      {...rest}
    />
  );
}
