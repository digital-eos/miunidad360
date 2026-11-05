"use client";

import { useProgress } from "@react-three/drei";
import { cn } from "@/lib/utils";

export function LoadingOverlay() {
  const { progress, active } = useProgress();

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background transition-opacity duration-500",
        active ? "opacity-100" : "opacity-0",
      )}
    >
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-strong">Modelo BIM</p>
      <div className="h-px w-40 overflow-hidden rounded-full bg-border-subtle">
        <div
          className="h-full bg-accent transition-[width] duration-200"
          style={{ width: `${Math.max(4, progress)}%` }}
        />
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground-muted">
        Cargando el modelo 3D…
      </p>
    </div>
  );
}
