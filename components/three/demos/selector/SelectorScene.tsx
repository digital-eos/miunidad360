"use client";

import { Suspense } from "react";
import { ContactShadows } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import type { BuildingConfig } from "@/lib/three/building-config";
import { Building } from "@/components/three/demos/maqueta/Building";
import { Context } from "@/components/three/demos/maqueta/Context";
import { Lighting } from "@/components/three/demos/maqueta/Lighting";
import { NightAnimator } from "@/components/three/demos/maqueta/NightAnimator";
import { CameraRig, type Viewpoint } from "@/components/three/demos/maqueta/CameraRig";

export type SelectorSceneProps = {
  config: BuildingConfig;
  cameraTarget: Viewpoint;
  cameraTargetKey: string;
  isMobile: boolean;
  minDistance: number;
  maxDistance: number;
  apartmentColors: Record<string, string>;
  apartmentOpacities: Record<string, number>;
  focusFloor: number | null;
  hoveredId: string | null;
  onApartmentClick: (id: string, event: ThreeEvent<MouseEvent>) => void;
  onApartmentPointerOver: (id: string, event: ThreeEvent<PointerEvent>) => void;
  onApartmentPointerOut: (id: string, event: ThreeEvent<PointerEvent>) => void;
};

export function SelectorScene({
  config,
  cameraTarget,
  cameraTargetKey,
  isMobile,
  minDistance,
  maxDistance,
  apartmentColors,
  apartmentOpacities,
  focusFloor,
  hoveredId,
  onApartmentClick,
  onApartmentPointerOver,
  onApartmentPointerOut,
}: SelectorSceneProps) {
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
        apartmentOpacities={apartmentOpacities}
        focusFloor={focusFloor}
        hoveredId={hoveredId}
        onApartmentClick={onApartmentClick}
        onApartmentPointerOver={onApartmentPointerOver}
        onApartmentPointerOut={onApartmentPointerOut}
      />
      <Context config={config} />

      <ContactShadows
        position={[0, 0.04, 0]}
        opacity={0.5}
        scale={Math.max(config.buildingWidth, config.buildingDepth) * 1.8}
        blur={2.2}
        far={config.groundFloorHeight + 2}
        resolution={isMobile ? 512 : 1024}
      />

      <CameraRig
        target={cameraTarget}
        targetKey={cameraTargetKey}
        autoRotateEnabled={false}
        minDistance={minDistance}
        maxDistance={maxDistance}
      />
    </>
  );
}
