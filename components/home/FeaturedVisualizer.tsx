"use client";

import dynamic from "next/dynamic";
import { useWebGLSupport } from "@/lib/hooks/use-webgl-support";
import type { BimViewer } from "@/components/three/demos/bim/use-bim-viewer";

const BimExperience = dynamic(
  () =>
    import("@/components/three/demos/bim/BimExperience").then((mod) => mod.BimExperience),
  { ssr: false, loading: () => null }
);

export type FeaturedVisualizerProps = {
  viewer: BimViewer;
  enableIdleHint?: boolean;
  modeSwitcherTopClassName?: string;
  posterSrc?: string;
};

/**
 * The BIM demo's visualizer, embedded in the homepage's "El resultado" frame (see
 * /demos/bim for the standalone page). Unlike BimCanvas it has no capture-mode stage and
 * a transparent loading fallback, since the frame already paints a poster image behind it.
 */
export function FeaturedVisualizer(props: FeaturedVisualizerProps) {
  const supportsWebGL = useWebGLSupport();

  if (supportsWebGL === false) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-background bg-grid px-6 text-center">
        <p className="font-display text-xl">Tu navegador no soporta WebGL</p>
        <p className="max-w-sm text-sm text-foreground-muted">
          Para ver esta experiencia 3D necesitás un navegador con soporte WebGL
          habilitado.
        </p>
      </div>
    );
  }

  if (supportsWebGL === null) return null;

  return <BimExperience {...props} />;
}
