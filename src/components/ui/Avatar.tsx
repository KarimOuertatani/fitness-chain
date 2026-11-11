import { cn } from "@/lib/utils";

/** Teintes de la palette Fitness Chain utilisées pour les avatars. */
const HUES: [string, string][] = [
  ["#7c3aed", "#3b82f6"],
  ["#6c59fa", "#22d3ee"],
  ["#8b5cf6", "#0fddfc"],
  ["#3b82f6", "#22d3ee"],
  ["#7c3aed", "#14a5df"],
  ["#6c59fa", "#3b82f6"],
];

function bytesOf(address: string): number[] {
  const hex = address.toLowerCase().replace(/^0x/, "").padEnd(40, "0").slice(0, 40);
  return hex.match(/.{2}/g)!.map((h) => Number.parseInt(h, 16) || 0);
}

/**
 * Avatar généré à partir d'une adresse (motif symétrique 5×5, toujours identique pour une même adresse).
 * Permet de reconnaître un compte d'un coup d'œil sans lire l'adresse.
 */
export function Avatar({ address, size = 32, className }: { address: string; size?: number; className?: string }) {
  const bytes = bytesOf(address);
  const [from, to] = HUES[bytes[0] % HUES.length];
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      if (bytes[1 + y * 3 + x] % 2 === 0) {
        cells.push({ x, y });
        if (x < 2) cells.push({ x: 4 - x, y });
      }
    }
  }
  const id = `av-${address.slice(2, 10)}`;
  return (
    <svg
      viewBox="0 0 5 5"
      width={size}
      height={size}
      className={cn("shrink-0 rounded-full ring-1 ring-white/15", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="5" height="5" fill={`url(#${id})`} />
      {cells.map(({ x, y }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="rgba(255,255,255,0.55)" />
      ))}
    </svg>
  );
}
