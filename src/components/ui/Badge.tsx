import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type BadgeTone = "violet" | "cyan" | "yellow" | "green" | "red" | "orange" | "gray" | "gold";

const TONES: Record<BadgeTone, string> = {
  violet: "border-primary-light/45 bg-primary/15 text-primary-light shadow-[0_0_14px_-4px_rgba(139,92,246,0.7)]",
  cyan: "border-cyan/45 bg-cyan/10 text-cyan shadow-[0_0_14px_-4px_rgba(34,211,238,0.7)]",
  yellow: "border-warning/45 bg-warning/10 text-warning shadow-[0_0_14px_-4px_rgba(234,179,8,0.7)]",
  green: "border-success/45 bg-success/10 text-success shadow-[0_0_14px_-4px_rgba(34,197,94,0.7)]",
  red: "border-danger/45 bg-danger/10 text-danger shadow-[0_0_14px_-4px_rgba(239,68,68,0.7)]",
  orange: "border-orange/45 bg-orange/10 text-orange shadow-[0_0_14px_-4px_rgba(249,115,22,0.7)]",
  gray: "border-white/15 bg-white/5 text-muted",
  gold: "border-gold/45 bg-gold/10 text-gold shadow-[0_0_14px_-4px_rgba(245,184,61,0.7)]",
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
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap",
        TONES[tone],
        className
      )}
    >
      {Icon && <Icon className="size-3.5 shrink-0" aria-hidden />}
      <span className="truncate">{children}</span>
    </span>
  );
}
