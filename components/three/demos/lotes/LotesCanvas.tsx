"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { useWebGLSupport } from "@/lib/hooks/use-webgl-support";

const LotesExperience = dynamic(
  () => import("./LotesExperience").then((mod) => mod.LotesExperience),
  { ssr: false, loading: () => <LotesFallback /> }
);

function LotesFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background bg-grid">
      <p className="eyebrow">
        Cargando el barrio…
      </p>
    </div>
  );
}

/** The Barrio Demo viewer, full screen. `children` are overlays (back link, scroll cue). */
export function LotesCanvas({ children }: { children?: ReactNode }) {
  const supportsWebGL = useWebGLSupport();

  let stage: ReactNode;
  if (supportsWebGL === false) {
    stage = (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-background bg-grid px-6 text-center">
        <p className="font-display text-2xl">Tu navegador no soporta WebGL</p>
        <p className="max-w-sm text-sm text-foreground-muted">
          Para ver el barrio en 3D necesitás un navegador con soporte WebGL habilitado.
        </p>
      </div>
    );
  } else if (supportsWebGL === null) {
    stage = <LotesFallback />;
  } else {
    stage = <LotesExperience />;
  }

  return (
    <div className="relative h-[100svh] w-full">
      {stage}
      {children}
    </div>
  );
}
