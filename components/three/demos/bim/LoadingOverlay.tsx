"use client";

import { useProgress } from "@react-three/drei";
import { cn } from "@/lib/utils";

export function LoadingOverlay({ posterSrc }: { posterSrc?: string }) {
  const { progress, active } = useProgress();

  if (posterSrc) {
    return (
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-10 overflow-hidden transition-opacity duration-500",
          active ? "opacity-100" : "opacity-0"
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static poster, no next/image config needed for this one image */}
        <img src={posterSrc} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-6 flex justify-center">
          <div className="flex items-center gap-3 rounded-full border border-border-subtle bg-background/90 px-4 py-2 backdrop-blur-md">
            <span className="h-px w-16 overflow-hidden rounded-full bg-border-subtle">
              <span
                className="block h-full bg-accent transition-[width] duration-200"
                style={{ width: `${Math.max(4, progress)}%` }}
              />
            </span>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground-muted">
              Cargando…
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background transition-opacity duration-500",
        active ? "opacity-100" : "opacity-0"
      )}
    >
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-strong">
        Modelo BIM
      </p>
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
