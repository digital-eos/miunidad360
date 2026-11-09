"use client";

import { lazy, Suspense, useRef } from "react";
import { ContactShadows } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import type { BuildingConfig } from "@/lib/three/building-config";
import type { FloorPlan } from "@/lib/units/floor-plan";
import { CameraRig, type Viewpoint } from "@/components/three/CameraRig";
import { PostFX } from "@/components/three/visual/PostFX";
import { EdificioModel, type UnitPinTarget } from "./EdificioModel";
import { EdificioCity } from "./EdificioCity";
import { EdificioLighting } from "./EdificioLighting";
import type { GeoEnvironmentProps } from "@/components/three/geo/GeoEnvironment";

/** Real-location environment (Google 3D tiles, atmosphere, flyover): loaded only when used. */
const GeoEnvironment = lazy(() => import("@/components/three/geo/GeoEnvironment"));

export type SelectorGeoOptions = Omit<
  GeoEnvironmentProps,
  "isMobile" | "footprint" | "onReady" | "children"
> & {
  /** The aerial intro is still flying: the orbit controls wait for it. */
  introActive: boolean;
};

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
  availableIds?: Set<string>;
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
  /** Real geographic environment instead of the procedural city. */
  geo?: SelectorGeoOptions | null;
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
  geo = null,
  ...model
}: SelectorSceneProps) {
  const building = <EdificioModel config={config} castShadow={!isMobile} {...model} />;
  const { introActive = false, ...geoProps } = geo ?? {};

  return (
    <>
      {geo ? (
        <Suspense fallback={null}>
          <GeoEnvironment
            {...(geoProps as Omit<SelectorGeoOptions, "introActive">)}
            isMobile={isMobile}
            footprint={{
              halfX: config.buildingWidth / 2 + config.balconyDepth,
              halfZ: config.buildingDepth / 2 + config.balconyDepth,
            }}
            onReady={() => onReady?.()}
          >
            {building}
          </GeoEnvironment>
        </Suspense>
      ) : (
        <>
          <Suspense fallback={null}>
            <EdificioLighting highQuality={!isMobile} />
            <ReadySignal onReady={onReady} />
          </Suspense>

          {building}
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
        </>
      )}

      {/* During the aerial intro the flyover drives the camera; the rig takes over after. */}
      {introActive ? null : (
        <CameraRig
          target={cameraTarget}
          targetKey={cameraTargetKey}
          autoRotateEnabled={autoRotate}
          autoRotateSpeed={0.55}
          minDistance={minDistance}
          maxDistance={maxDistance}
          startFromCurrent={Boolean(geo)}
          onInteractionChange={(interacting) => {
            if (interacting) onInteraction?.();
          }}
        />
      )}
    </>
  );
}
