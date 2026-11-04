"use client";

import { cn } from "@/lib/utils";
import type { ViewpointId } from "./CameraRig";

const VIEWPOINT_LABELS: { id: ViewpointId; label: string }[] = [
  { id: "aerial", label: "Vista aérea" },
  { id: "street", label: "Desde la calle" },
  { id: "facade", label: "Fachada" },
];

type ControlsPanelProps = {
  isNight: boolean;
  onToggleNight: () => void;
  activeViewpoint: ViewpointId;
  onSelectViewpoint: (id: ViewpointId) => void;
};

export function ControlsPanel({
  isNight,
  onToggleNight,
  activeViewpoint,
  onSelectViewpoint,
}: ControlsPanelProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-4 sm:p-6">
      <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-border-subtle bg-background/80 p-1.5 backdrop-blur-md">
        {VIEWPOINT_LABELS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelectViewpoint(id)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium tracking-wide transition-colors duration-200 sm:text-sm",
              activeViewpoint === id
                ? "bg-accent text-accent-foreground"
                : "text-foreground-muted hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-border-subtle" aria-hidden />
        <button
          type="button"
          onClick={onToggleNight}
          aria-pressed={isNight}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-xs font-medium tracking-wide transition-colors duration-200 sm:text-sm",
            isNight ? "bg-accent text-accent-foreground" : "text-foreground-muted hover:text-foreground",
          )}
        >
          {isNight ? "Noche" : "Día"}
        </button>
      </div>
      <p className="pointer-events-none font-mono text-[10px] uppercase tracking-[0.2em] text-foreground-muted/70 sm:text-xs">
        Arrastrá para rotar · Rueda para zoom
      </p>
    </div>
  );
}
