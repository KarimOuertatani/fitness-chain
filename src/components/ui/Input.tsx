"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const FIELD =
  "w-full rounded-2xl border border-transparent bg-input text-[15px] text-white placeholder:text-subtle " +
  "outline-none transition focus:border-cyan focus:ring-2 focus:ring-cyan/25 disabled:opacity-50";

interface FieldShellProps {
  id: string;
  label?: string;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
  children: ReactNode;
}

function FieldShell({ id, label, hint, error, className, children }: FieldShellProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-muted">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  hint?: ReactNode;
  error?: string | null;
  icon?: LucideIcon;
  /** Élément affiché à droite (ex. « FTC ») */
  suffix?: ReactNode;
  containerClassName?: string;
}

export function Input({ label, hint, error, icon: Icon, suffix, containerClassName, className, id, ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} className={containerClassName}>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-subtle" aria-hidden />
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(FIELD, "h-[52px]", Icon ? "pl-12" : "pl-4", suffix ? "pr-16" : "pr-4", error && "border-danger", className)}
          {...rest}
        />
        {suffix && (
          <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm font-semibold text-muted">
            {suffix}
          </span>
        )}
      </div>
    </FieldShell>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: ReactNode;
  error?: string | null;
  containerClassName?: string;
}

export function Textarea({ label, hint, error, containerClassName, className, id, rows = 3, ...rest }: TextareaProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} className={containerClassName}>
      <textarea
        id={inputId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        className={cn(FIELD, "resize-y px-4 py-3", error && "border-danger", className)}
        {...rest}
      />
    </FieldShell>
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: ReactNode;
  error?: string | null;
  icon?: LucideIcon;
  containerClassName?: string;
}

export function Select({ label, hint, error, icon: Icon, containerClassName, className, id, children, ...rest }: SelectProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell id={inputId} label={label} hint={hint} error={error} className={containerClassName}>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-subtle" aria-hidden />
        )}
        <select
          id={inputId}
          className={cn(FIELD, "h-[52px] appearance-none pr-10", Icon ? "pl-12" : "pl-4", className)}
          {...rest}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted" aria-hidden>
          ▾
        </span>
      </div>
    </FieldShell>
  );
}

export interface FileInputProps {
  label: string;
  accept?: string;
  file: File | null;
  onChange: (file: File | null) => void;
  hint?: ReactNode;
  icon?: LucideIcon;
  disabled?: boolean;
}

export function FileInput({ label, accept, file, onChange, hint, icon: Icon, disabled }: FileInputProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint}>
      <label
        htmlFor={id}
        className={cn(
          "flex min-h-[52px] cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border-strong bg-input/60 px-4 py-3",
          "text-sm text-muted transition hover:border-cyan focus-within:border-cyan",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        {Icon && <Icon className="size-5 shrink-0 text-subtle" aria-hidden />}
        <span className="min-w-0 flex-1 truncate">{file ? file.name : "Choisir un fichier…"}</span>
        {file && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onChange(null);
            }}
            className="rounded-lg px-2 py-1 text-xs text-subtle hover:bg-white/10 hover:text-white"
          >
            Retirer
          </button>
        )}
        <input
          id={id}
          type="file"
          accept={accept}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            onChange(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
      </label>
    </FieldShell>
  );
}

export function Checkbox({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition",
        checked ? "border-primary-light/60 bg-primary/15" : "border-border bg-white/[0.03] hover:border-border-strong",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-5 shrink-0 accent-primary"
      />
      <span className="min-w-0">
        <span className="block font-semibold text-white">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-muted">{description}</span>}
      </span>
    </label>
  );
}
