"use client";

import { useProgress } from "@react-three/drei";
import { cn } from "@/lib/utils";

export function LoadingOverlay({
  posterSrc,
  posterMobileSrc,
}: {
  posterSrc?: string;
  /** Lighter poster for phones (max-width: 767px). */
  posterMobileSrc?: string;
}) {
  const { progress, active } = useProgress();

  if (posterSrc) {
    return (
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-10 overflow-hidden transition-opacity duration-500",
          active ? "opacity-100" : "opacity-0"
        )}
      >
        <picture className="block h-full w-full">
          {posterMobileSrc ? (
            <source media="(max-width: 767px)" srcSet={posterMobileSrc} />
          ) : null}
          <img src={posterSrc} alt="" className="h-full w-full object-cover" />
        </picture>
        <div className="absolute inset-x-0 bottom-6 flex justify-center">
          <div className="flex items-center gap-3 rounded-md border border-border-subtle bg-surface px-4 py-2">
            <span className="h-px w-16 overflow-hidden rounded-full bg-border-subtle">
              <span
                className="block h-full bg-primary transition-[width] duration-200"
                style={{ width: `${Math.max(4, progress)}%` }}
              />
            </span>
            <p className="label-caps text-foreground-muted">
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
      <p className="eyebrow">
        Modelo BIM
      </p>
      <div className="h-px w-40 overflow-hidden rounded-full bg-border-subtle">
        <div
          className="h-full bg-primary transition-[width] duration-200"
          style={{ width: `${Math.max(4, progress)}%` }}
        />
      </div>
      <p className="label-caps text-foreground-muted">
        Cargando el modelo 3D…
      </p>
    </div>
  );
}
