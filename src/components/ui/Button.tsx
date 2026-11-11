import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";

export type ButtonVariant = "primary" | "secondary" | "glass" | "ghost" | "success" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-gradient-primary text-white shadow-glow-primary hover:brightness-110",
  secondary: "bg-gradient-secondary text-white shadow-glow-cyan hover:brightness-110",
  glass: "border border-border bg-white/[0.06] text-white backdrop-blur-xl hover:border-border-strong hover:bg-white/10",
  ghost: "bg-transparent text-muted hover:bg-white/5 hover:text-white",
  success: "border border-success/40 bg-success/15 text-success hover:bg-success/25",
  danger: "border border-danger/40 bg-danger/15 text-danger hover:bg-danger/25",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-10 rounded-xl px-4 text-sm gap-2",
  md: "h-[52px] rounded-2xl px-5 text-[15px] gap-2.5",
  lg: "h-14 rounded-2xl px-6 text-base gap-3",
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  fullWidth?: boolean;
  className?: string;
  children?: ReactNode;
}

export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
}: Pick<CommonProps, "variant" | "size" | "fullWidth" | "className">) {
  return cn(
    "inline-flex select-none items-center justify-center font-semibold whitespace-nowrap transition duration-200",
    "disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98]",
    VARIANTS[variant],
    SIZES[size],
    fullWidth && "w-full",
    className
  );
}

export interface ButtonProps extends CommonProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  loading?: boolean;
}

export function Button({
  variant,
  size,
  icon: Icon,
  iconRight: IconRight,
  fullWidth,
  loading,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const iconSize = size === "sm" ? "size-4" : "size-5";
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...rest}
    >
      {loading ? <Spinner className={iconSize} /> : Icon ? <Icon className={iconSize} aria-hidden /> : null}
      {children && <span className="truncate">{children}</span>}
      {IconRight && !loading && <IconRight className={iconSize} aria-hidden />}
    </button>
  );
}

export interface ButtonLinkProps extends CommonProps {
  href: string;
  external?: boolean;
  "aria-label"?: string;
}

export function ButtonLink({
  href,
  external,
  variant,
  size,
  icon: Icon,
  iconRight: IconRight,
  fullWidth,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  const iconSize = size === "sm" ? "size-4" : "size-5";
  const content = (
    <>
      {Icon && <Icon className={iconSize} aria-hidden />}
      {children && <span className="truncate">{children}</span>}
      {IconRight && <IconRight className={iconSize} aria-hidden />}
    </>
  );
  const classes = buttonClasses({ variant, size, fullWidth, className });
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...rest}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...rest}>
      {content}
    </Link>
  );
}
