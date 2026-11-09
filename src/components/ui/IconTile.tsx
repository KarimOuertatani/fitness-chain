import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type IconTone = "violet" | "cyan" | "blue" | "green" | "yellow" | "red" | "gold" | "orange";

const TONES: Record<IconTone, string> = {
  violet: "bg-primary/20 text-primary-light",
  cyan: "bg-cyan/15 text-cyan",
  blue: "bg-blue/20 text-blue",
  green: "bg-success/15 text-success",
  yellow: "bg-warning/15 text-warning",
  red: "bg-danger/15 text-danger",
  gold: "bg-gold/15 text-gold",
  orange: "bg-orange/15 text-orange",
};

/** Carré arrondi de 40 px teinté de la couleur de l'icône. */
export function IconTile({
  icon: Icon,
  tone = "violet",
  size = "md",
  className,
}: {
  icon: LucideIcon;
  tone?: IconTone;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        size === "md" ? "size-10 rounded-xl" : "size-12 rounded-2xl",
        TONES[tone],
        className
      )}
      aria-hidden
    >
      <Icon className={size === "md" ? "size-5" : "size-6"} />
    </span>
  );
}
