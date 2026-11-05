"use client";

import { cn } from "@/lib/utils";
import type { FloorLevel } from "@/lib/bim/dataset";

type CutControlsProps = {
  cutHeight: number;
  maxHeight: number;
  floorLevels: FloorLevel[];
  onChangeCutHeight: (height: number) => void;
  align?: "center" | "end";
};

export function CutControls({
  cutHeight,
  maxHeight,
  floorLevels,
  onChangeCutHeight,
  align = "center",
}: CutControlsProps) {
  const isFull = cutHeight >= maxHeight - 0.05;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-9 z-30 flex flex-col gap-2 p-3 sm:bottom-11 sm:p-6",
        align === "end" ? "items-end" : "items-center",
      )}
    >
      <div className="pointer-events-auto w-full max-w-xl space-y-3 rounded-2xl border border-border-subtle bg-background/90 p-4 backdrop-blur-md">
        <div className="flex items-center justify-between text-sm">
          <p className="font-display text-base">
            {isFull ? "Edificio completo" : `Corte a ${cutHeight.toFixed(1)} m`}
          </p>
        </div>

        <input
          type="range"
          min={0.5}
          max={maxHeight}
          step={0.1}
          value={cutHeight}
          onChange={(e) => onChangeCutHeight(Number(e.target.value))}
          className="h-2 w-full accent-accent"
          aria-label="Altura de corte"
        />

        <div className="flex flex-wrap items-center gap-2">
          {floorLevels.map(({ floor, label, top }) => (
            <button
              key={floor}
              type="button"
              onClick={() => onChangeCutHeight(top)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200",
                Math.abs(cutHeight - top) < 0.05
                  ? "border-accent text-accent-strong"
                  : "border-border-subtle text-foreground-muted hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChangeCutHeight(maxHeight)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200",
              isFull
                ? "border-accent text-accent-strong"
                : "border-border-subtle text-foreground-muted hover:text-foreground",
            )}
          >
            Completo
          </button>
        </div>
      </div>
    </div>
  );
}
