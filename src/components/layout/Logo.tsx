import Link from "next/link";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/** Éclair dans un anneau dégradé violet → bleu, avec halo lumineux. */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center rounded-[28%] bg-bg-deep", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="absolute inset-0 rounded-[28%] bg-primary/40 blur-md" />
      <span className="relative inline-flex size-[78%] items-center justify-center rounded-full bg-[conic-gradient(from_200deg,#7c3aed,#3b82f6,#7c3aed)] p-[2px] shadow-[0_0_18px_rgba(124,58,237,0.75)]">
        <span className="flex size-full items-center justify-center rounded-full bg-bg-deep">
          <Zap className="size-[55%] fill-primary-light text-primary-light" />
        </span>
      </span>
    </span>
  );
}

export function Logo({ href = "/", compact, className }: { href?: string; compact?: boolean; className?: string }) {
  return (
    <Link href={href} className={cn("flex min-w-0 items-center gap-3", className)} aria-label="Fitness Chain — accueil">
      <LogoMark size={compact ? 36 : 42} />
      <span className="truncate text-sm font-extrabold tracking-[0.28em] text-white">
        FITNESS <span className="text-gradient">CHAIN</span>
      </span>
    </Link>
  );
}
