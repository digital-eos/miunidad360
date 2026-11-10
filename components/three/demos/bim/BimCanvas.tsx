"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { useWebGLSupport } from "@/lib/hooks/use-webgl-support";
import { useCaptureMode } from "@/lib/hooks/use-capture-mode";
import { featuredProject } from "@/config/featured";
import { CaptureStage } from "@/components/capture/CaptureStage";
import { BimInfoPanel } from "./BimInfoPanel";
import { useBimViewer } from "./use-bim-viewer";

const BimExperience = dynamic(
  () => import("./BimExperience").then((mod) => mod.BimExperience),
  {
    ssr: false,
    loading: () => <BimFallback />,
  }
);

function BimFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background bg-grid">
      <p className="eyebrow">
        Cargando el modelo BIM…
      </p>
    </div>
  );
}

/**
 * Standalone BIM demo: the 3D view with the info card beside it (below it on mobile).
 * `children` are overlays drawn on the 3D view (back link, scroll cue).
 */
export function BimCanvas({ children }: { children?: ReactNode }) {
  const supportsWebGL = useWebGLSupport();
  const viewer = useBimViewer({ syncUrl: true });
  const { active: isCapturing } = useCaptureMode();

  let stage: ReactNode;
  if (supportsWebGL === false) {
    stage = (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-background bg-grid px-6 text-center">
        <p className="font-display text-2xl">Tu navegador no soporta WebGL</p>
        <p className="max-w-sm text-sm text-foreground-muted">
          Para ver el modelo BIM 3D necesitás un navegador con soporte WebGL habilitado.
        </p>
      </div>
    );
  } else if (supportsWebGL === null) {
    stage = <BimFallback />;
  } else {
    stage = (
      <CaptureStage demo="bim" className="h-full">
        <BimExperience viewer={viewer} />
      </CaptureStage>
    );
  }

  if (isCapturing) {
    return <div className="relative h-[100svh] w-full">{stage}</div>;
  }

  return (
    <div className="flex flex-col lg:h-[100svh] lg:flex-row">
      <div className="relative h-[70svh] w-full lg:h-full lg:flex-1">
        {stage}
        {children}
      </div>
      <BimInfoPanel
        viewer={viewer}
        projectName={`${featuredProject.nombre} · ${featuredProject.ubicacion}`}
        className="border-t border-border-subtle lg:h-full lg:w-[380px] lg:border-t-0 lg:border-l"
      />
    </div>
  );
}
