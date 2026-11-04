"use client";

import { Suspense } from "react";
import { ContactShadows } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { type BuildingConfig, defaultBuildingConfig } from "@/lib/three/building-config";
import { generateTallNorthwestNeighbor, plazaHalfExtent } from "@/lib/three/context-layout";
import type { SunPosition } from "@/lib/sun/sun-position";
import { Building } from "@/components/three/demos/maqueta/Building";
import { Context } from "@/components/three/demos/maqueta/Context";
import { CameraRig, type Viewpoint } from "@/components/three/demos/maqueta/CameraRig";
import { SunLighting } from "./SunLighting";
import { SunCompass } from "./SunCompass";

export type SolSceneProps = {
  config?: BuildingConfig;
  sunPosition: SunPosition;
  cameraTarget: Viewpoint;
  cameraTargetKey: string;
  isMobile: boolean;
  minDistance: number;
  maxDistance: number;
  apartmentColors?: Record<string, string>;
  hoveredId: string | null;
  onApartmentClick: (id: string, event: ThreeEvent<MouseEvent>) => void;
  onApartmentPointerOver: (id: string, event: ThreeEvent<PointerEvent>) => void;
  onApartmentPointerOut: (id: string, event: ThreeEvent<PointerEvent>) => void;
};

export function SolScene({
  config = defaultBuildingConfig,
  sunPosition,
  cameraTarget,
  cameraTargetKey,
  isMobile,
  minDistance,
  maxDistance,
  apartmentColors,
  hoveredId,
  onApartmentClick,
  onApartmentPointerOver,
  onApartmentPointerOut,
}: SolSceneProps) {
  const tower = generateTallNorthwestNeighbor(config);
  const { halfW, halfD } = plazaHalfExtent(config);

  return (
    <>
      <Suspense fallback={null}>
        <SunLighting sunPosition={sunPosition} config={config} shadowsEnabled={!isMobile} />
      </Suspense>

      <Building
        config={config}
        castShadow={!isMobile}
        apartmentColors={apartmentColors}
        hoveredId={hoveredId}
        onApartmentClick={onApartmentClick}
        onApartmentPointerOver={onApartmentPointerOver}
        onApartmentPointerOut={onApartmentPointerOut}
      />
      <Context config={config} extraNeighbors={[tower]} />
      <SunCompass position={[-(halfW + 2.5), 0.05, -(halfD + 2.5)]} />

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
