"use client";

import { lazy, Suspense, useRef, useState } from "react";
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
import { MapGround, type MapGroundProps } from "@/components/three/geo/MapGround";
import { MapIntro } from "@/components/three/geo/MapIntro";
import type { FlyoverCaption } from "@/components/three/geo/AerialFlyover";

/** Real-location environment (Google 3D tiles, atmosphere, flyover): loaded only when used. */
const GeoEnvironment = lazy(() => import("@/components/three/geo/GeoEnvironment"));

export type SelectorGeoOptions = Omit<
  GeoEnvironmentProps,
  "isMobile" | "footprint" | "onReady" | "children"
> & {
  /** The aerial intro is still flying: the orbit controls wait for it. */
  introActive: boolean;
};

/** Real location as a flat street map under the tower, with its entrance descent. */
export type SelectorMapOptions = Pick<MapGroundProps, "apiKey" | "onFallback" | "onAttribution"> & {
  /** The entrance descent is running: the orbit controls wait for it. */
  introActive: boolean;
  endView: Viewpoint;
  skipToken: number;
  onCaption: (caption: FlyoverCaption) => void;
  onIntroDone: () => void;
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
  /** Real street map (2D) under the tower instead of the procedural city. Ignored with `geo`. */
  map?: SelectorMapOptions | null;
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
  map = null,
  ...model
}: SelectorSceneProps) {
  const building = <EdificioModel config={config} castShadow={!isMobile} {...model} />;
  const { introActive: geoIntro = false, ...geoProps } = geo ?? {};
  const introActive = geo ? geoIntro : Boolean(map?.introActive);
  const [mapReady, setMapReady] = useState(false);

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
            <EdificioLighting highQuality={!isMobile} fogRange={map ? [260, 1150] : undefined} />
            {/* The map signals ready itself, once its tiles are drawn. */}
            {map ? null : <ReadySignal onReady={onReady} />}
          </Suspense>

          {building}
          {map ? (
            <>
              <MapGround
                apiKey={map.apiKey}
                onFallback={map.onFallback}
                onAttribution={map.onAttribution}
                isMobile={isMobile}
                onReady={() => {
                  setMapReady(true);
                  onReady?.();
                }}
              />
              {map.introActive ? (
                <MapIntro
                  ready={mapReady}
                  endView={map.endView}
                  skipToken={map.skipToken}
                  onCaption={map.onCaption}
                  onComplete={map.onIntroDone}
                />
              ) : null}
            </>
          ) : (
            <EdificioCity castShadow={!isMobile} />
          )}

          <ContactShadows
            position={[0, map ? 0.03 : 0.17, 0]}
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
          startFromCurrent={Boolean(geo || map)}
          onInteractionChange={(interacting) => {
            if (interacting) onInteraction?.();
          }}
        />
      )}
    </>
  );
}
