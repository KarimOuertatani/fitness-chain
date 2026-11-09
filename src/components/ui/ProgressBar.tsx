import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  max = 100,
  label,
  className,
  marker,
}: {
  value: number;
  max?: number;
  label?: string;
  className?: string;
  /** Position (0–max) d'un repère vertical, ex. seuil de majorité */
  marker?: number;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const markerPct = marker != null && max > 0 ? Math.min(100, Math.max(0, (marker / max) * 100)) : null;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn("relative h-2.5 w-full overflow-hidden rounded-full bg-white/10", className)}
    >
      <div
        className="h-full rounded-full bg-gradient-progress shadow-[0_0_12px_rgba(15,221,252,0.6)] transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
      {markerPct != null && (
        <span className="absolute top-0 h-full w-0.5 bg-white/70" style={{ left: `calc(${markerPct}% - 1px)` }} aria-hidden />
      )}
    </div>
  );
}
