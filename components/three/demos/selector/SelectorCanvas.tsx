"use client";

import dynamic from "next/dynamic";
import { Suspense, type ReactNode } from "react";
import { useWebGLSupport } from "@/lib/hooks/use-webgl-support";
import { CaptureStage } from "@/components/capture/CaptureStage";

const SelectorExperience = dynamic(
  () => import("./SelectorExperience").then((mod) => mod.SelectorExperience),
  { ssr: false, loading: () => <SelectorFallback /> },
);

function SelectorFallback({
  className = "h-[65svh] rounded-2xl lg:h-[80svh]",
}: {
  className?: string;
}) {
  return (
    <div className={`flex w-full items-center justify-center bg-background bg-grid ${className}`}>
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-strong">
        Cargando el selector…
      </p>
    </div>
  );
}

export function SelectorCanvas({
  projectSlug,
  embedded = false,
  children,
}: {
  projectSlug: string;
  /** Framed version for the homepage: no capture stage, no full-screen height. */
  embedded?: boolean;
  /** Overlays drawn on the 3D view (back link, scroll cue). */
  children?: ReactNode;
}) {
  const supportsWebGL = useWebGLSupport();

  if (supportsWebGL === false) {
    return (
      <div
        className={`flex w-full flex-col items-center justify-center gap-3 bg-background bg-grid px-6 text-center ${embedded ? "h-[65vh] rounded-2xl" : "h-[100svh]"}`}
      >
        <p className="font-display text-2xl">Tu navegador no soporta WebGL</p>
        <p className="max-w-sm text-sm text-foreground-muted">
          Para ver el selector de unidades 3D necesitás un navegador con soporte WebGL habilitado.
        </p>
      </div>
    );
  }

  if (supportsWebGL === null) {
    return <SelectorFallback className={embedded ? "h-[65vh] rounded-2xl" : undefined} />;
  }

  if (embedded) {
    return (
      <Suspense fallback={<SelectorFallback className="h-[65vh] rounded-2xl" />}>
        <SelectorExperience projectSlug={projectSlug} embedded>
          {children}
        </SelectorExperience>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<SelectorFallback />}>
      <CaptureStage demo="selector" className="">
        <SelectorExperience projectSlug={projectSlug}>{children}</SelectorExperience>
      </CaptureStage>
    </Suspense>
  );
}
