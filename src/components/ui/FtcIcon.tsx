import Image from "next/image";
import { formatFTC } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Choisit la plus petite image suffisante pour la taille affichée (écrans haute densité compris). */
function sourceFor(size: number): string {
  if (size <= 32) return "/brand/fitcoin-64.png";
  if (size <= 64) return "/brand/fitcoin-128.png";
  if (size <= 128) return "/brand/fitcoin-256.png";
  return "/brand/fitcoin-512.png";
}

/**
 * Pièce FitCoin à une taille fixe (en pixels).
 * Décorative par défaut ; passer `alt` si l'image porte une information.
 */
export function FtcCoin({
  size = 24,
  className,
  alt,
  priority,
}: {
  size?: number;
  className?: string;
  alt?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={sourceFor(size)}
      width={size}
      height={size}
      alt={alt ?? ""}
      aria-hidden={alt ? undefined : true}
      priority={priority}
      className={cn("shrink-0 select-none", className)}
      draggable={false}
    />
  );
}

/**
 * Pièce FitCoin dimensionnée par classes CSS (ex. « size-5 »).
 * Même signature qu'une icône lucide : utilisable partout où un composant `icon` est attendu.
 */
export function FtcGlyph({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/fitcoin-64.png"
      width={64}
      height={64}
      alt=""
      aria-hidden
      className={cn("size-5 shrink-0 select-none", className)}
      draggable={false}
    />
  );
}

/** Montant FTC précédé de la pièce, à la taille du texte. */
export function FtcAmount({
  value,
  className,
  decimals,
  withSymbol = true,
  sign,
}: {
  value: bigint | null | undefined;
  className?: string;
  decimals?: number;
  withSymbol?: boolean;
  /** Préfixe affiché avant le montant (ex. « + ») */
  sign?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-[0.35em] whitespace-nowrap tabular-nums", className)}>
      <FtcGlyph className="size-[1.15em]" />
      <span>
        {sign}
        {formatFTC(value, { decimals, withSymbol })}
      </span>
    </span>
  );
}
