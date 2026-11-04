"use client";

import dynamic from "next/dynamic";
import { useInView } from "@/lib/hooks/use-in-view";
import { useWebGLSupport } from "@/lib/hooks/use-webgl-support";

const MaquetaPreviewScene = dynamic(() => import("./MaquetaPreviewScene"), {
  ssr: false,
});

function BarsPlaceholder() {
  return (
    <div className="relative flex h-40 items-end justify-center gap-2 overflow-hidden rounded-xl bg-background p-4">
      {[0.5, 0.9, 0.65, 1, 0.75].map((h, i) => (
        <div
          key={i}
          className="w-6 rounded-sm bg-foreground/15"
          style={{ height: `${h * 100}%` }}
        />
      ))}
      <div className="absolute inset-0 bg-grid opacity-40" />
    </div>
  );
}

export function MaquetaPreviewCanvas() {
  const { ref, inView } = useInView<HTMLDivElement>();
  const supportsWebGL = useWebGLSupport();

  return (
    <div ref={ref} className="h-40 overflow-hidden rounded-xl bg-background">
      {inView && supportsWebGL ? <MaquetaPreviewScene /> : <BarsPlaceholder />}
    </div>
  );
}
