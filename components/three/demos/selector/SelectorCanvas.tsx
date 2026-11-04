"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { useWebGLSupport } from "@/lib/hooks/use-webgl-support";

const SelectorExperience = dynamic(
  () => import("./SelectorExperience").then((mod) => mod.SelectorExperience),
  { ssr: false, loading: () => <SelectorFallback /> },
);

function SelectorFallback() {
  return (
    <div className="flex h-[100svh] w-full items-center justify-center bg-background bg-grid">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
        Cargando el selector…
      </p>
    </div>
  );
}

export function SelectorCanvas({ projectSlug }: { projectSlug: string }) {
  const supportsWebGL = useWebGLSupport();

  if (supportsWebGL === false) {
    return (
      <div className="flex h-[100svh] w-full flex-col items-center justify-center gap-3 bg-background bg-grid px-6 text-center">
        <p className="font-display text-2xl">Tu navegador no soporta WebGL</p>
        <p className="max-w-sm text-sm text-foreground-muted">
          Para ver el selector de unidades 3D necesitás un navegador con soporte WebGL habilitado.
        </p>
      </div>
    );
  }

  if (supportsWebGL === null) {
    return <SelectorFallback />;
  }

  return (
    <Suspense fallback={<SelectorFallback />}>
      <SelectorExperience projectSlug={projectSlug} />
    </Suspense>
  );
}
