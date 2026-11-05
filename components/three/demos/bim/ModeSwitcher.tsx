"use client";

import { cn } from "@/lib/utils";
import type { BimMode } from "./BimModel";

const MODES: { id: BimMode; label: string }[] = [
  { id: "unidades", label: "Unidades" },
  { id: "avance", label: "Avance de obra" },
  { id: "corte", label: "Corte" },
];

export function ModeSwitcher({
  mode,
  onSelectMode,
}: {
  mode: BimMode;
  onSelectMode: (mode: BimMode) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-16 z-10 flex justify-center px-3 sm:top-6">
      <div className="pointer-events-auto flex max-w-full flex-wrap justify-center gap-1 rounded-full border border-border-subtle bg-background/85 p-1.5 backdrop-blur-md">
        {MODES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelectMode(id)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium tracking-wide whitespace-nowrap transition-colors duration-200 sm:text-sm",
              mode === id
                ? "bg-accent text-accent-foreground"
                : "text-foreground-muted hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
