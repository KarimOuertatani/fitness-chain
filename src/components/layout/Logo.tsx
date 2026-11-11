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
      <span className="absolute inset-0 rounded-[28%] bg-primary/35 blur-md" />
      <span className="relative inline-flex size-[78%] items-center justify-center rounded-full bg-[conic-gradient(from_200deg,#7c3aed,#3b82f6,#7c3aed)] p-[2px] shadow-[0_0_16px_rgba(124,58,237,0.6)]">
        <span className="flex size-full items-center justify-center rounded-full bg-bg-deep">
          <Zap className="size-[55%] fill-primary-light text-primary-light" />
        </span>
      </span>
    </span>
  );
}

export function Logo({ href = "/", compact, className }: { href?: string; compact?: boolean; className?: string }) {
  return (
    <Link href={href} className={cn("flex min-w-0 items-center gap-2.5", className)} aria-label="Fitness Chain — accueil">
      <LogoMark size={compact ? 32 : 36} />
      <span className="flex flex-col leading-none">
        <span className="text-[13px] font-extrabold tracking-[0.2em] whitespace-nowrap text-white">
          FITNESS <span className="text-gradient">CHAIN</span>
        </span>
        {!compact && <span className="mt-1 text-[10px] font-medium tracking-[0.12em] text-subtle uppercase">DApp fitness</span>}
      </span>
    </Link>
  );
}
