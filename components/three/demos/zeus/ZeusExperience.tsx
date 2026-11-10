"use client";

import { Suspense, useCallback, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { sphereFitDistance } from "@/lib/three/camera-framing";
import { useElementAspect } from "@/lib/hooks/use-element-aspect";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { STOREY_HEIGHT, ZEUS_SIZE } from "@/lib/zeus/dataset";
import { CameraRig, type Viewpoint } from "@/components/three/CameraRig";
import { PostFX } from "@/components/three/visual/PostFX";
import { BimLighting } from "@/components/three/demos/bim/BimLighting";
import { LoadingOverlay } from "@/components/three/demos/bim/LoadingOverlay";
import { ZeusModel } from "./ZeusModel";
import { ZeusSite, GROUND_Y } from "./ZeusSite";
import type { ZeusViewer } from "./use-zeus-viewer";

const FOV = 38;

function useZeusCamera(containerRef: RefObject<HTMLDivElement | null>) {
  const aspect = useElementAspect(containerRef);

  return useMemo(() => {
    const halfW = ZEUS_SIZE.width / 2;
    const halfH = ZEUS_SIZE.height / 2;
    const halfD = ZEUS_SIZE.depth / 2;
    const radius = Math.sqrt(halfW * halfW + halfH * halfH + halfD * halfD);
    const elevation = (24 * Math.PI) / 180;
    const azimuth = (32 * Math.PI) / 180;
    const distance = Math.max(sphereFitDistance(radius, FOV, aspect), radius + 6);
    const position: [number, number, number] = [
      Math.cos(elevation) * Math.sin(azimuth) * distance,
      halfH + Math.sin(elevation) * distance,
      Math.cos(elevation) * Math.cos(azimuth) * distance,
    ];
    return {
      position,
      target: [0, halfH * 0.9, 0] as [number, number, number],
      distance,
      minDistance: Math.max(halfW, halfD) + 4,
      maxDistance: distance * 1.7,
    };
  }, [aspect]);
}

export function ZeusExperience({
  viewer,
  posterSrc,
}: {
  viewer: ZeusViewer;
  /** Render shown while the 3D scene loads. */
  posterSrc?: string;
}) {
  const { floor, selectedUnit, selectFloor, openUnit, unidadesByObjeto } = viewer;
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();
  const camera = useZeusCamera(containerRef);
  const maxDpr = isMobile ? 1.5 : 2;
  const [dpr, setDpr] = useState(maxDpr);
  const [hoveredUnit, setHoveredUnit] = useState<string | null>(null);

  const handleUnitClick = useCallback((name: string) => openUnit(name), [openUnit]);

  // Same angle as the overview, closer and from a bit higher, aimed at the open floor.
  const viewpoint: Viewpoint = useMemo(() => {
    if (floor === null) return camera;
    const mid = floor * STOREY_HEIGHT + 1.2;
    const zoom = 0.78;
    const offset = camera.position.map((p, i) => (p - camera.target[i]) * zoom);
    return {
      position: [offset[0], mid + offset[1] + 6, offset[2]],
      target: [0, mid, 0],
    };
  }, [camera, floor]);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full ${hoveredUnit ? "cursor-pointer" : ""}`}
    >
      <Canvas
        camera={{ position: viewpoint.position, fov: FOV, near: 0.1, far: 400 }}
        dpr={dpr}
        shadows={!isMobile}
        gl={{
          antialias: !isMobile,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
      >
        <PerformanceMonitor
          bounds={() => [50, 58]}
          onDecline={() => setDpr((d) => Math.max(0.75, d - 0.25))}
          onIncline={() => setDpr((d) => Math.min(maxDpr, d + 0.25))}
        />
        <BimLighting highQuality={!isMobile} />
        <Suspense fallback={null}>
          <ZeusModel
            floor={floor}
            hoveredUnit={hoveredUnit}
            selectedUnit={selectedUnit}
            unidadesByObjeto={unidadesByObjeto}
            onUnitHover={setHoveredUnit}
            onUnitClick={handleUnitClick}
            onFloorClick={selectFloor}
            reducedMotion={prefersReducedMotion}
          />
        </Suspense>
        <ZeusSite />
        <ContactShadows
          position={[0, GROUND_Y + 0.02, 0]}
          opacity={0.35}
          scale={Math.max(ZEUS_SIZE.width, ZEUS_SIZE.depth) * 1.8}
          blur={2.4}
          far={8}
          resolution={isMobile ? 512 : 1024}
        />
        {!isMobile ? <PostFX /> : null}
        <CameraRig
          target={viewpoint}
          targetKey={`floor-${floor ?? "all"}`}
          autoRotateEnabled={!prefersReducedMotion && !isMobile && floor === null}
          autoRotateSpeed={0.35}
          minDistance={camera.minDistance}
          maxDistance={camera.maxDistance}
        />
      </Canvas>

      <LoadingOverlay posterSrc={posterSrc} />

      {floor !== null ? (
        <button
          type="button"
          onClick={() => selectFloor(null)}
          className="absolute top-4 right-4 z-10 rounded-md border border-border-subtle bg-surface px-3.5 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-background"
        >
          Ver edificio completo
        </button>
      ) : null}
    </div>
  );
}
