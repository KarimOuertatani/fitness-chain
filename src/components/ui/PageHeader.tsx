import type { ReactNode } from "react";

/** En-tête de page : surtitre, titre en dégradé, description et actions. */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  /** Petit libellé au-dessus du titre (ex. « Espace centre ») */
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-cyan uppercase">{eyebrow}</p>}
        <h1 className="text-gradient text-[28px] leading-tight font-bold sm:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[15px] text-muted">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  );
}
