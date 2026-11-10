"use client";

import { cn } from "@/lib/utils";
import type { BimMode } from "./BimModel";

const MODES: { id: BimMode; label: string }[] = [
  { id: "corte", label: "Corte" },
  { id: "unidades", label: "Unidades" },
  { id: "avance", label: "Avance de obra" },
];

export function ModeSwitcher({
  mode,
  onSelectMode,
  pulseMode = null,
  topClassName = "top-16 sm:top-6",
}: {
  mode: BimMode;
  onSelectMode: (mode: BimMode) => void;
  /** Mode whose tab should play a one-off attention pulse (e.g. an idle hint). */
  pulseMode?: BimMode | null;
  topClassName?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 z-30 flex justify-center px-3",
        topClassName
      )}
    >
      <div className="pointer-events-auto flex max-w-full flex-wrap justify-center gap-1 rounded-lg border border-border-subtle bg-surface p-1 shadow-[var(--shadow-panel)]">
        {MODES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelectMode(id)}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-xs font-medium tracking-wide whitespace-nowrap transition-colors duration-200 sm:text-sm",
              mode === id
                ? "bg-primary text-primary-foreground"
                : "text-foreground-muted hover:text-foreground",
              pulseMode === id && "ring-1 ring-highlight"
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
