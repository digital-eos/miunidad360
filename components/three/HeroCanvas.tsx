"use client";

import dynamic from "next/dynamic";
import { SceneFallback } from "./SceneFallback";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { useWebGLSupport } from "@/lib/hooks/use-webgl-support";

const HeroScene = dynamic(() => import("./HeroScene"), {
  ssr: false,
  loading: () => <SceneFallback />,
});

export function HeroCanvas() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const supportsWebGL = useWebGLSupport();

  if (supportsWebGL === false) {
    return <SceneFallback />;
  }

  return (
    <div className="absolute inset-0">
      {supportsWebGL === null ? (
        <SceneFallback />
      ) : (
        <HeroScene spinning={!prefersReducedMotion} />
      )}
    </div>
  );
}
