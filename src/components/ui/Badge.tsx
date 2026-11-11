import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type BadgeTone = "violet" | "cyan" | "yellow" | "green" | "red" | "orange" | "gray" | "gold";

const TONES: Record<BadgeTone, string> = {
  violet: "border-primary-light/35 bg-primary/12 text-primary-light",
  cyan: "border-cyan/35 bg-cyan/10 text-cyan",
  yellow: "border-warning/35 bg-warning/10 text-warning",
  green: "border-success/35 bg-success/10 text-success",
  red: "border-danger/35 bg-danger/10 text-danger",
  orange: "border-orange/35 bg-orange/10 text-orange",
  gray: "border-white/12 bg-white/5 text-muted",
  gold: "border-gold/35 bg-gold/10 text-gold",
};

export function Badge({
  tone = "violet",
  icon: Icon,
  children,
  className,
}: {
  tone?: BadgeTone;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        TONES[tone],
        className
      )}
    >
      {Icon && <Icon className="size-3.5 shrink-0" aria-hidden />}
      <span className="truncate">{children}</span>
    </span>
  );
}
