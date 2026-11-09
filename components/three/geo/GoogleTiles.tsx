"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import type { TilesRenderer as TilesRendererImpl } from "3d-tiles-renderer";
import {
  GLTFExtensionsPlugin,
  GoogleCloudAuthPlugin,
  TileCompressionPlugin,
  TileFlatteningPlugin,
  TilesFadePlugin,
} from "3d-tiles-renderer/plugins";
import {
  TilesAttributionOverlay,
  TilesPlugin,
  TilesRenderer,
} from "3d-tiles-renderer/r3f";
import { sceneToEcefMatrix, siteUp } from "@/lib/geo/site";
import { TileNormalsPlugin } from "@/lib/geo/TileNormalsPlugin";

export type TilesStatus =
  { kind: "loading" } | { kind: "error"; reason: string } | { kind: "ready" };

export type CoverageReport = {
  /** Smallest geometric error among tiles loaded within 250 m of the site (meters). */
  finestErrorNearSite: number;
  /** True when those tiles look like photogrammetry (sub-meter), not just terrain. */
  photorealistic3D: boolean;
};

/** Footprint pressed flat to ground level (scene meters): the tower plus balconies, +0.5 m. */
export type FlattenBox = { minX: number; maxX: number; minZ: number; maxZ: number };

const GOOGLE_LOGO =
  "https://maps.gstatic.com/mapfiles/api-3/images/google_white5_hdpi.png";

let dracoLoader: DRACOLoader | null = null;
function getDracoLoader() {
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/geo/draco/");
  }
  return dracoLoader;
}

/** Street centerline samples (scene coords) used to measure ground level. */
const GROUND_SAMPLES: [number, number][] = [
  [-14, 17.8],
  [-6, 17.8],
  [0, 17.8],
  [6, 17.8],
  [14, 17.8],
];

type Props = {
  apiKey: string;
  /** Ellipsoid height mapped to scene y = 0. */
  groundHeight: number;
  onGroundMeasured: (height: number) => void;
  flatten: FlattenBox;
  isMobile: boolean;
  onStatus: (status: TilesStatus) => void;
  onCoverage?: (report: CoverageReport) => void;
  onTiles?: (tiles: TilesRendererImpl | null) => void;
};

/**
 * Google Photorealistic 3D Tiles placed in the selector's scene frame: the address sits next
 * to the origin, +Y is up, +Z is the street side. The lot under the tower is pressed flat so
 * whatever Google captured there doesn't poke through the model.
 */
export function GoogleTiles({
  apiKey,
  groundHeight,
  onGroundMeasured,
  flatten,
  isMobile,
  onStatus,
  onCoverage,
  onTiles,
}: Props) {
  // The renderer is a mutable three.js object: kept in a ref, with a counter to re-run effects.
  const tilesRef = useRef<TilesRendererImpl | null>(null);
  const [tilesVersion, setTilesVersion] = useState(0);
  const setTiles = useCallback((instance: TilesRendererImpl | null) => {
    if (tilesRef.current === instance) return;
    tilesRef.current = instance;
    setTilesVersion((v) => v + 1);
  }, []);
  const flatteningRef = useRef<TileFlatteningPlugin | null>(null);
  const shapeRef = useRef<THREE.Mesh | null>(null);
  const statusRef = useRef<TilesStatus["kind"]>("loading");

  const authArgs = useMemo(
    () => ({
      apiToken: apiKey,
      autoRefreshToken: true,
      logoUrl: GOOGLE_LOGO,
      useRecommendedSettings: true,
    }),
    [apiKey]
  );
  const normalsArgs = useMemo(() => ({ workers: isMobile ? 1 : 2 }), [isMobile]);

  // Earth → scene. Applied to the tileset's root group directly.
  useEffect(() => {
    const tiles = tilesRef.current;
    if (!tiles) return;
    const group = tiles.group;
    group.matrixAutoUpdate = false;
    group.matrix.copy(sceneToEcefMatrix(groundHeight).invert());
    group.matrix.decompose(group.position, group.quaternion, group.scale);
    group.updateMatrixWorld(true);
    tiles.dispatchEvent({ type: "needs-update" });

    // The flattening shape lives in the tileset's own (ECEF) frame.
    const plugin = flatteningRef.current;
    if (!plugin) return;
    const { minX, maxX, minZ, maxZ } = flatten;
    const plane = new THREE.PlaneGeometry(maxX - minX, maxZ - minZ);
    plane.rotateX(-Math.PI / 2);
    plane.translate((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
    const shape = new THREE.Mesh(plane);
    shape.applyMatrix4(sceneToEcefMatrix(groundHeight));
    shape.updateMatrixWorld(true);
    if (shapeRef.current && plugin.hasShape(shapeRef.current))
      plugin.deleteShape(shapeRef.current);
    // Rays point down: vertices above the plane are pressed onto it.
    // (The bundled typings still show the old numeric threshold argument.)
    const addShape = plugin.addShape.bind(plugin) as unknown as (
      mesh: THREE.Object3D,
      direction: THREE.Vector3,
      options: { threshold?: number }
    ) => void;
    addShape(shape, siteUp().negate(), {});
    shapeRef.current = shape;
    return () => {
      plane.dispose();
    };
  }, [tilesVersion, groundHeight, flatten]);

  // Status, errors and coverage.
  useEffect(() => {
    const tiles = tilesRef.current;
    if (!tiles) return;
    onTiles?.(tiles);
    let finest = Infinity;
    const center = new THREE.Vector3();
    const sphere = new THREE.Sphere();

    const onRoot = () => {
      if (statusRef.current === "loading") {
        statusRef.current = "ready";
        onStatus({ kind: "ready" });
      }
    };
    const onError = (event: { tile?: unknown; error?: unknown; url?: string }) => {
      // A failed child tile is not fatal; a failed root (bad key, quota, network) is.
      if (!tiles.root || statusRef.current === "loading") {
        statusRef.current = "error";
        const reason =
          event.error instanceof Error ? event.error.message : String(event.error);
        onStatus({ kind: "error", reason });
      }
    };
    type LoadedTile = {
      geometricError: number;
      engineData?: { boundingVolume?: { getSphere: (s: THREE.Sphere) => void } };
    };
    const onModel = (event: { tile: LoadedTile }) => {
      const tile = event.tile;
      // Distance from the site to this tile's bounding volume.
      const volume = tile.engineData?.boundingVolume;
      if (!volume) return;
      volume.getSphere(sphere);
      sphere.applyMatrix4(tiles.group.matrixWorld);
      center.set(0, 0, 0);
      if (sphere.distanceToPoint(center) > 250) return;
      if (tile.geometricError < finest) {
        finest = tile.geometricError;
        const report = { finestErrorNearSite: finest, photorealistic3D: finest < 2 };
        onCoverage?.(report);
        if (typeof window !== "undefined") {
          (window as unknown as { __geoCoverage?: CoverageReport }).__geoCoverage =
            report;
        }
      }
    };

    tiles.addEventListener("load-root-tileset", onRoot);
    tiles.addEventListener("load-error", onError as never);
    tiles.addEventListener("load-model", onModel as never);
    return () => {
      tiles.removeEventListener("load-root-tileset", onRoot);
      tiles.removeEventListener("load-error", onError as never);
      tiles.removeEventListener("load-model", onModel as never);
      onTiles?.(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tilesVersion]);

  // Memory and detail budget: lighter on phones.
  useEffect(() => {
    const tiles = tilesRef.current;
    if (!tiles) return;
    tiles.errorTarget = isMobile ? 24 : 12;
    tiles.lruCache.minSize = isMobile ? 300 : 900;
    tiles.lruCache.maxSize = isMobile ? 600 : 1800;
    const cache = tiles.lruCache as unknown as {
      minBytesSize?: number;
      maxBytesSize?: number;
    };
    if ("maxBytesSize" in cache) {
      cache.minBytesSize = (isMobile ? 120 : 300) * 1024 ** 2;
      cache.maxBytesSize = (isMobile ? 220 : 600) * 1024 ** 2;
    }
  }, [tilesVersion, isMobile]);

  return (
    <TilesRenderer ref={setTiles} key={apiKey}>
      <TilesPlugin plugin={GoogleCloudAuthPlugin} args={[authArgs]} />
      <TilesPlugin plugin={GLTFExtensionsPlugin} dracoLoader={getDracoLoader()} />
      <TilesPlugin plugin={TileCompressionPlugin} />
      <TilesPlugin plugin={TilesFadePlugin} />
      <TilesPlugin plugin={TileNormalsPlugin} args={[normalsArgs]} />
      <TilesPlugin plugin={TileFlatteningPlugin} ref={flatteningRef as never} />
      <GroundCalibration
        tilesRef={tilesRef}
        groundHeight={groundHeight}
        onMeasured={onGroundMeasured}
      />
      <TilesAttributionOverlay
        style={{
          left: "auto",
          right: 8,
          bottom: 26,
          textAlign: "right",
          fontSize: 10,
          color: "rgba(255,255,255,0.9)",
          textShadow: "0 0 3px rgba(0,0,0,0.6)",
          maxWidth: "60%",
          pointerEvents: "none",
        }}
      />
    </TilesRenderer>
  );
}

/**
 * Measures where Google's road surface really is in front of the lot and re-bases the
 * tileset so the street sits at y = 0 under the tower. Re-runs while finer tiles stream in;
 * small corrections only, so nothing visibly jumps.
 */
function GroundCalibration({
  tilesRef,
  groundHeight,
  onMeasured,
}: {
  tilesRef: React.RefObject<TilesRendererImpl | null>;
  groundHeight: number;
  onMeasured: (height: number) => void;
}) {
  const raycaster = useMemo(() => {
    const r = new THREE.Raycaster();
    r.far = 2000;
    return r;
  }, []);
  const last = useRef(0);

  useFrame(() => {
    const tiles = tilesRef.current;
    const now = performance.now();
    if (!tiles || now - last.current < 800) return;
    last.current = now;

    const hits: number[] = [];
    for (const [x, z] of GROUND_SAMPLES) {
      raycaster.set(new THREE.Vector3(x, 400, z), new THREE.Vector3(0, -1, 0));
      const hit = raycaster.intersectObject(tiles.group, true)[0];
      if (hit) hits.push(hit.point.y);
    }
    if (hits.length < 3) return;
    hits.sort((a, b) => a - b);
    // Lower half median: ignores cars, trees and awnings over the road.
    const offset = hits[Math.floor((hits.length - 1) / 2)];
    if (Math.abs(offset) < 0.05) return;
    onMeasured(groundHeight + offset);
  });

  return null;
}
