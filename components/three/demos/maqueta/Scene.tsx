"use client";

import { Suspense } from "react";
import { ContactShadows } from "@react-three/drei";
import type { BuildingConfig } from "@/lib/three/building-config";
import { Building } from "./Building";
import { Context } from "./Context";
import { Lighting } from "./Lighting";
import { NightAnimator } from "./NightAnimator";
import { NightBloom } from "./NightBloom";
import { CameraRig, type ViewpointId, type Viewpoints } from "./CameraRig";

export type SceneProps = {
  config: BuildingConfig;
  viewpoints: Viewpoints;
  activeViewpoint: ViewpointId;
  autoRotateEnabled: boolean;
  isMobile: boolean;
  minDistance: number;
  maxDistance: number;
  apartmentColors?: Record<string, string>;
  highlightFloor?: number | null;
  hoveredId?: string | null;
  onApartmentClick?: (id: string) => void;
  onApartmentPointerOver?: (id: string) => void;
  onApartmentPointerOut?: (id: string) => void;
};

export function Scene({
  config,
  viewpoints,
  activeViewpoint,
  autoRotateEnabled,
  isMobile,
  minDistance,
  maxDistance,
  apartmentColors,
  highlightFloor,
  hoveredId,
  onApartmentClick,
  onApartmentPointerOver,
  onApartmentPointerOut,
}: SceneProps) {
  return (
    <>
      <NightAnimator />
      <Suspense fallback={null}>
        <Lighting />
      </Suspense>

      <Building
        config={config}
        castShadow={!isMobile}
        apartmentColors={apartmentColors}
        highlightFloor={highlightFloor}
        hoveredId={hoveredId}
        onApartmentClick={onApartmentClick}
        onApartmentPointerOver={onApartmentPointerOver}
        onApartmentPointerOut={onApartmentPointerOut}
      />
      <Context config={config} />

      <ContactShadows
        position={[0, 0.04, 0]}
        opacity={0.55}
        scale={Math.max(config.buildingWidth, config.buildingDepth) * 1.8}
        blur={2.2}
        far={config.groundFloorHeight + 2}
        resolution={isMobile ? 512 : 1024}
      />

      <CameraRig
        viewpoints={viewpoints}
        activeViewpoint={activeViewpoint}
        autoRotateEnabled={autoRotateEnabled}
        minDistance={minDistance}
        maxDistance={maxDistance}
      />

      {!isMobile && <NightBloom />}
    </>
  );
}
