"use client";

import dynamic from "next/dynamic";
import { useWebGLSupport } from "@/lib/hooks/use-webgl-support";
import { CaptureStage } from "@/components/capture/CaptureStage";

const BimExperience = dynamic(() => import("./BimExperience").then((mod) => mod.BimExperience), {
  ssr: false,
  loading: () => <BimFallback />,
});

function BimFallback() {
  return (
    <div className="flex h-[100svh] w-full items-center justify-center bg-background bg-grid">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-strong">
        Cargando el modelo BIM…
      </p>
    </div>
  );
}

export function BimCanvas() {
  const supportsWebGL = useWebGLSupport();

  if (supportsWebGL === false) {
    return (
      <div className="flex h-[100svh] w-full flex-col items-center justify-center gap-3 bg-background bg-grid px-6 text-center">
        <p className="font-display text-2xl">Tu navegador no soporta WebGL</p>
        <p className="max-w-sm text-sm text-foreground-muted">
          Para ver el modelo BIM 3D necesitás un navegador con soporte WebGL habilitado.
        </p>
      </div>
    );
  }

  if (supportsWebGL === null) {
    return <BimFallback />;
  }

  return (
    <CaptureStage demo="bim">
      <BimExperience />
    </CaptureStage>
  );
}
