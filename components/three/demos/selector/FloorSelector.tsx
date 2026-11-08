"use client";

import { cn } from "@/lib/utils";

export function FloorSelector({
  floors,
  activeFloor,
  onSelectFloor,
}: {
  floors: number;
  activeFloor: number | null;
  onSelectFloor: (floor: number | null) => void;
}) {
  const floorList = Array.from({ length: floors }, (_, i) => floors - i);

  return (
    <div className="pointer-events-none absolute inset-y-0 left-2 z-20 flex items-center sm:left-4">
      {/* Leaves room for the back link above and the disclaimer below on short phones. */}
      <div className="pointer-events-auto flex max-h-[calc(100%-7rem)] flex-col items-center gap-1 overflow-y-auto rounded-2xl border border-border-subtle bg-background/80 p-1.5 backdrop-blur-md sm:max-h-[70vh] sm:p-2">
        <button
          type="button"
          onClick={() => onSelectFloor(null)}
          className={cn(
            "rounded-full px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide transition-colors duration-200",
            activeFloor === null
              ? "bg-accent text-accent-foreground"
              : "text-foreground-muted hover:text-foreground",
          )}
        >
          Todos
        </button>
        <div className="my-1 h-px w-6 bg-border-subtle" aria-hidden />
        {floorList.map((floor) => (
          <button
            key={floor}
            type="button"
            onClick={() => onSelectFloor(floor)}
            aria-pressed={activeFloor === floor}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors duration-200",
              activeFloor === floor
                ? "bg-accent text-accent-foreground"
                : "text-foreground-muted hover:text-foreground",
            )}
          >
            {floor}
          </button>
        ))}
      </div>
    </div>
  );
}
