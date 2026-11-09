"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { useWebGLSupport } from "@/lib/hooks/use-webgl-support";
import { zeusData } from "@/lib/zeus/dataset";
import { ZeusInfoPanel } from "./ZeusInfoPanel";
import { useZeusViewer } from "./use-zeus-viewer";

const ZeusExperience = dynamic(
  () => import("./ZeusExperience").then((mod) => mod.ZeusExperience),
  { ssr: false, loading: () => <ZeusFallback /> }
);

function ZeusFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background bg-grid">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-strong">
        Cargando el edificio…
      </p>
    </div>
  );
}

/**
 * Zeus III demo: the 3D building with the info card beside it (below it on mobile).
 * `children` are overlays drawn on the 3D view (back link, scroll cue).
 */
export function ZeusCanvas({ children }: { children?: ReactNode }) {
  const supportsWebGL = useWebGLSupport();
  const viewer = useZeusViewer({ syncUrl: true });

  let stage: ReactNode;
  if (supportsWebGL === false) {
    stage = (
      <div className="relative h-full w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={zeusData.galeria[0].src}
          alt={zeusData.galeria[0].alt}
          className="h-full w-full object-cover"
        />
        <p className="absolute inset-x-0 bottom-6 mx-auto w-fit rounded-full bg-background/90 px-4 py-2 text-sm">
          Tu navegador no soporta WebGL: elegí las unidades en la lista.
        </p>
      </div>
    );
  } else if (supportsWebGL === null) {
    stage = <ZeusFallback />;
  } else {
    stage = <ZeusExperience viewer={viewer} posterSrc={zeusData.galeria[0].src} />;
  }

  return (
    <div className="flex flex-col lg:h-[100svh] lg:flex-row">
      <div className="relative h-[70svh] w-full lg:h-full lg:flex-1">
        {stage}
        {children}
      </div>
      <ZeusInfoPanel
        viewer={viewer}
        className="border-t border-border-subtle lg:h-full lg:w-[380px] lg:border-t-0 lg:border-l"
      />
    </div>
  );
}
