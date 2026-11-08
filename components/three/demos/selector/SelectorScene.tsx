"use client";

import { Suspense, useRef } from "react";
import { ContactShadows } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import type { BuildingConfig } from "@/lib/three/building-config";
import type { FloorPlan } from "@/lib/units/floor-plan";
import { CameraRig, type Viewpoint } from "@/components/three/CameraRig";
import { PostFX } from "@/components/three/visual/PostFX";
import { EdificioModel, type UnitPinTarget } from "./EdificioModel";
import { EdificioCity } from "./EdificioCity";
import { EdificioLighting } from "./EdificioLighting";

export type SelectorSceneProps = {
  config: BuildingConfig;
  cameraTarget: Viewpoint;
  cameraTargetKey: string;
  isMobile: boolean;
  autoRotate: boolean;
  minDistance: number;
  maxDistance: number;
  apartmentColors: Record<string, string>;
  dimmedIds: Set<string>;
  showStatus: boolean;
  focusFloor: number | null;
  hoveredId: string | null;
  selectedId: string | null;
  openPlan?: FloorPlan | null;
  pins?: UnitPinTarget[];
  onApartmentClick: (id: string, event: ThreeEvent<MouseEvent>) => void;
  onApartmentPointerOver: (id: string, event: ThreeEvent<PointerEvent>) => void;
  onApartmentPointerOut: (id: string, event: ThreeEvent<PointerEvent>) => void;
  onInteraction?: () => void;
  /** Called once the lit scene has drawn its first frames. */
  onReady?: () => void;
};

/** Fires `onReady` after a couple of rendered frames (shaders compiled, environment loaded). */
function ReadySignal({ onReady }: { onReady?: () => void }) {
  const frames = useRef(0);
  const done = useRef(false);
  useFrame(() => {
    frames.current += 1;
    if (!done.current && frames.current > 2) {
      done.current = true;
      onReady?.();
    }
  });
  return null;
}

export function SelectorScene({
  config,
  cameraTarget,
  cameraTargetKey,
  isMobile,
  autoRotate,
  minDistance,
  maxDistance,
  onInteraction,
  onReady,
  ...model
}: SelectorSceneProps) {
  return (
    <>
      <Suspense fallback={null}>
        <EdificioLighting highQuality={!isMobile} />
        <ReadySignal onReady={onReady} />
      </Suspense>

      <EdificioModel config={config} castShadow={!isMobile} {...model} />
      <EdificioCity castShadow={!isMobile} />

      <ContactShadows
        position={[0, 0.17, 0]}
        opacity={0.35}
        scale={Math.max(config.buildingWidth, config.buildingDepth) * 1.6}
        blur={2.4}
        far={5}
        resolution={isMobile ? 512 : 1024}
      />

      {/* Desktop only: mobile keeps the plain renderer (ACES set on gl). */}
      {!isMobile ? <PostFX aoRadius={1.4} /> : null}

      <CameraRig
        target={cameraTarget}
        targetKey={cameraTargetKey}
        autoRotateEnabled={autoRotate}
        autoRotateSpeed={0.55}
        minDistance={minDistance}
        maxDistance={maxDistance}
        onInteractionChange={(interacting) => {
          if (interacting) onInteraction?.();
        }}
      />
    </>
  );
}
