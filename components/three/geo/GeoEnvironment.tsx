"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import type { TilesRenderer as TilesRendererImpl } from "3d-tiles-renderer";
import type { Viewpoint } from "@/components/three/CameraRig";
import { SITE } from "@/lib/geo/site";
import { GEO_PREVIEW_KEY } from "@/lib/geo/config";
import { todayInBuenosAires } from "@/lib/sun/sun-position";
import { GoogleTiles, type FlattenBox, type TilesStatus } from "./GoogleTiles";
import { DynamicClipPlanes, GeoAtmosphere, LIGHT_SOURCE_LAYER } from "./GeoAtmosphere";
import { AerialFlyover, type FlyoverCaption } from "./AerialFlyover";

export type GeoEnvironmentProps = {
  apiKey: string;
  isMobile: boolean;
  /** Fly in from over the sea; false lands directly on `endView`. */
  intro: boolean;
  endView: Viewpoint;
  skipToken: number;
  /** Half extents of the tower's footprint incl. balconies (scene meters). */
  footprint: { halfX: number; halfZ: number };
  onReady: () => void;
  onCaption: (caption: FlyoverCaption) => void;
  onIntroDone: () => void;
  /** Tiles can't be used (bad key, quota, no network, too slow): show the classic scene. */
  onFallback: (reason: string) => void;
  /** The existing building, lit by real lights. */
  children: ReactNode;
};

/** No root tileset after this long → classic scene. */
const ROOT_TIMEOUT_MS = 12000;
const FLIGHT_MS = 16000;

/** Today at 10:30 in Mar del Plata: morning sun on the ESE street facade. */
function morningSun(): Date {
  const { year, month, day } = todayInBuenosAires();
  return new Date(Date.UTC(year, month - 1, day, 13, 30)); // ART = UTC−3
}

export default function GeoEnvironment({
  apiKey,
  isMobile,
  intro,
  endView,
  skipToken,
  footprint,
  onReady,
  onCaption,
  onIntroDone,
  onFallback,
  children,
}: GeoEnvironmentProps) {
  const [groundHeight, setGroundHeight] = useState<number>(SITE.groundEllipsoidHeight);
  const [tiles, setTiles] = useState<TilesRendererImpl | null>(null);
  const [flying, setFlying] = useState(intro);
  const [skyReady, setSkyReady] = useState(false);
  const handleSkyReady = useCallback(() => setSkyReady(true), []);
  const date = useMemo(() => morningSun(), []);
  const preview = apiKey === GEO_PREVIEW_KEY;
  const settled = useRef(preview);

  const flatten = useMemo<FlattenBox>(
    () => ({
      minX: -footprint.halfX - 0.5,
      maxX: footprint.halfX + 0.5,
      minZ: -footprint.halfZ - 0.5,
      maxZ: footprint.halfZ + 0.5,
    }),
    [footprint.halfX, footprint.halfZ]
  );

  const handleStatus = useCallback(
    (status: TilesStatus) => {
      if (status.kind === "ready") settled.current = true;
      if (status.kind === "error") onFallback(status.reason || "tiles-error");
    },
    [onFallback]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!settled.current) onFallback("timeout");
    }, ROOT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [onFallback]);

  const handleGround = useCallback((height: number) => {
    // Sanity band around the surveyed value: never trust a hit on a rooftop or a hole.
    if (Math.abs(height - SITE.groundEllipsoidHeight) > 25) return;
    setGroundHeight(height);
  }, []);

  const handleFlightDone = useCallback(() => {
    setFlying(false);
    onIntroDone();
  }, [onIntroDone]);

  return (
    <GeoAtmosphere
      groundHeight={groundHeight}
      date={date}
      isMobile={isMobile}
      clouds={!isMobile}
      onTexturesReady={handleSkyReady}
    >
      {preview ? (
        <mesh rotation-x={-Math.PI / 2} position-y={-0.02}>
          <planeGeometry args={[20000, 20000]} />
          <meshBasicMaterial color="#8d8a80" />
        </mesh>
      ) : (
        <GoogleTiles
          apiKey={apiKey}
          groundHeight={groundHeight}
          onGroundMeasured={handleGround}
          flatten={flatten}
          isMobile={isMobile}
          onStatus={handleStatus}
          onTiles={setTiles}
        />
      )}
      {/* Reflections on glass and metal; dim, the sun and sky probe do the lighting. */}
      <Environment preset="city" environmentIntensity={0.06} />
      <LightSourceLayer>{children}</LightSourceLayer>
      <DynamicClipPlanes />
      {flying ? (
        <AerialFlyover
          tiles={tiles}
          preloaded={preview}
          skyReady={skyReady}
          groundHeight={groundHeight}
          endView={endView}
          durationMs={FLIGHT_MS}
          skipToken={skipToken}
          onStartVisible={onReady}
          onCaption={onCaption}
          onComplete={handleFlightDone}
        />
      ) : (
        <TilesReady
          tiles={tiles}
          preloaded={preview}
          skyReady={skyReady}
          onReady={onReady}
        />
      )}
    </GeoAtmosphere>
  );
}

/** Without the intro: reveal once the overview's tiles are in (or after a few seconds). */
function TilesReady({
  tiles,
  preloaded,
  skyReady,
  onReady,
}: {
  tiles: TilesRendererImpl | null;
  preloaded: boolean;
  skyReady: boolean;
  onReady: () => void;
}) {
  const done = useRef(false);
  const since = useRef(0);
  useFrame(() => {
    if (done.current) return;
    if (since.current === 0) since.current = performance.now();
    const loaded = skyReady && (preloaded || (tiles?.root && tiles.loadProgress >= 0.97));
    if (loaded || performance.now() - since.current > 7000) {
      done.current = true;
      onReady();
    }
  });
  return null;
}

/**
 * Puts everything inside on the light-source layer (kept on layer 0 too, for rendering and
 * pointer events). Re-applied every few frames: unit plans mount and unmount on selection.
 */
function LightSourceLayer({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const frame = useRef(0);
  useFrame(() => {
    if (frame.current++ % 15 !== 0) return;
    ref.current?.traverse((object) => object.layers.enable(LIGHT_SOURCE_LAYER));
  });
  return <group ref={ref}>{children}</group>;
}
