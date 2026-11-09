"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { useWebGLSupport } from "@/lib/hooks/use-webgl-support";
import { zeusData } from "@/lib/zeus/dataset";
import { ZeusInfoPanel } from "./ZeusInfoPanel";
import { useZeusViewer } from "./use-zeus-viewer";
import {
  FullscreenButton,
  fullscreenFrameClass,
  useFullscreenFrame,
} from "@/components/listing/use-fullscreen-frame";

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
 * Zeus III demo: the 3D building with the info card beside it (below it on mobile), framed
 * as the main card of the listing page, with a full-screen button.
 * `children` are extra overlays drawn on the 3D view.
 */
export function ZeusCanvas({ children }: { children?: ReactNode }) {
  const supportsWebGL = useWebGLSupport();
  const viewer = useZeusViewer({ syncUrl: true });
  const {
    ref: frameRef,
    expanded: frameExpanded,
    toggle: toggleFrame,
  } = useFullscreenFrame<HTMLDivElement>();

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
    <div
      ref={frameRef}
      className={fullscreenFrameClass(
        frameExpanded,
        "flex flex-col lg:h-[80svh] lg:flex-row"
      )}
    >
      <div
        className={
          frameExpanded
            ? "relative min-h-0 w-full flex-1 lg:h-full"
            : "relative h-[65svh] w-full lg:h-full lg:flex-1"
        }
      >
        {stage}
        <FullscreenButton expanded={frameExpanded} onToggle={toggleFrame} />
        {children}
      </div>
      <ZeusInfoPanel
        viewer={viewer}
        className={
          frameExpanded
            ? "max-h-[40dvh] border-t border-border-subtle lg:h-full lg:max-h-none lg:w-[380px] lg:border-t-0 lg:border-l"
            : "border-t border-border-subtle lg:h-full lg:w-[380px] lg:border-t-0 lg:border-l"
        }
      />
    </div>
  );
}
