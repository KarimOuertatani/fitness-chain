import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "info" | "warning" | "danger" | "success";

const TONES: Record<Tone, { cls: string; icon: LucideIcon }> = {
  info: { cls: "border-cyan/30 bg-cyan/10 text-cyan", icon: Info },
  warning: { cls: "border-warning/30 bg-warning/10 text-warning", icon: AlertTriangle },
  danger: { cls: "border-danger/30 bg-danger/10 text-danger", icon: XCircle },
  success: { cls: "border-success/30 bg-success/10 text-success", icon: CheckCircle2 },
};

export function Alert({ tone = "info", title, children, action, className }: { tone?: Tone; title?: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  const { cls, icon: Icon } = TONES[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex min-w-0 flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center", cls, className)}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="min-w-0 text-sm">
          {title && <p className="font-semibold">{title}</p>}
          {children && <div className="text-white/80">{children}</div>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
