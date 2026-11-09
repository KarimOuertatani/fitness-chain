"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TabItem<K extends string> {
  key: K;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

export function Tabs<K extends string>({
  tabs,
  active,
  onChange,
  className,
  label,
}: {
  tabs: TabItem<K>[];
  active: K;
  onChange: (key: K) => void;
  className?: string;
  label: string;
}) {
  const id = useId();
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const index = tabs.findIndex((t) => t.key === active);
    const next = (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    onChange(tabs[next].key);
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>("[role=tab]");
    buttons?.[next]?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn("glass flex max-w-full gap-1 overflow-x-auto rounded-2xl p-1.5", className)}
    >
      {tabs.map(({ key, label: tabLabel, icon: Icon, count }) => {
        const selected = key === active;
        return (
          <button
            key={key}
            id={`${id}-${key}`}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(key)}
            className={cn(
              "flex h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold whitespace-nowrap transition",
              selected
                ? "bg-primary/25 text-primary-light shadow-[inset_0_0_0_1px_rgba(139,92,246,0.4)]"
                : "text-muted hover:bg-white/5 hover:text-white"
            )}
          >
            {Icon && <Icon className="size-4" aria-hidden />}
            {tabLabel}
            {count != null && count > 0 && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="tabpanel" className={cn("mt-6", className)}>
      {children}
    </div>
  );
}
