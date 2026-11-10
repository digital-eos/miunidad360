"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { SITE } from "@/lib/geo/site";
import type { MapBlend } from "./MapGround";
import { buildingAttribute, createFacadeMaterial, FACADE_FLOOR_HEIGHT } from "./facade-material";

/**
 * The neighborhood: real building footprints around the lot (Google Open Buildings via Overture
 * Maps, extracted once into public/geo/buildings/), extruded to estimated heights (the data has
 * none) and dressed with procedural facades (facade-material.ts). They rise out of the street plan as the intro tilts
 * into 3D. Same frame as MapGround: +X east, −Z north, turned to the facade bearing.
 */

const DATA_URL = "/geo/buildings/cataluna-ii.json";
const FLOOR_HEIGHT = FACADE_FLOOR_HEIGHT;
const DEG = Math.PI / 180;

/** Footprints under this (m²) are dropped: the detection's sheds, awnings and false positives. */
const MIN_AREA = 30;
/** Under this (m²) a footprint is an annex: one floor. */
const SMALL_AREA = 60;

/**
 * The project has to read first: neighbors stay low around it and only reach their own height
 * further out. Max floors 2 up to NEAR meters from the tower, rising to 5 at FAR.
 */
const NEAR = 60;
const FAR = 220;
function maxFloorsAt(distance: number) {
  const t = THREE.MathUtils.clamp((distance - NEAR) / (FAR - NEAR), 0, 1);
  return distance > FAR ? Infinity : 2 + Math.floor(t * 3);
}

type BuildingsFile = { buildings: { r: [number, number][]; f?: number }[] };

/** Stable pseudo-random in [0, 1) from a position, so heights don't change between visits. */
function hash(x: number, y: number) {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function ringArea(ring: [number, number][]) {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

/**
 * Floors from footprint size, the typical mix around Paseo Aldrey: houses and PH on small lots,
 * mid-rise and some towers on the larger ones.
 */
function estimateFloors(area: number, r: number) {
  if (area < SMALL_AREA) return 1; // sheds, garages, back-of-lot annexes
  if (area < 90) return 1 + Math.floor(r * 2);
  if (area < 220) return 1 + Math.floor(r * 3);
  if (area < 500) return r > 0.82 ? 6 + Math.floor((r - 0.82) * 40) : 2 + Math.floor(r * 4);
  if (area < 1400) return r > 0.65 ? 8 + Math.floor((r - 0.65) * 20) : 3 + Math.floor(r * 6);
  return 1 + Math.floor(r * 3); // big footprints: warehouses, schools, the mall
}

function smoothstep(t: number) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

export function MapBuildings({
  blendRef,
  footprint,
  isMobile,
}: {
  blendRef: RefObject<MapBlend>;
  /** The tower's half size (scene meters): whatever the data has on the lot is left out. */
  footprint: { halfX: number; halfZ: number };
  isMobile: boolean;
}) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const rotationY = (SITE.facadeBearing + 180) * DEG;
  const radius = isMobile ? 380 : 600;
  const { halfX, halfZ } = footprint;

  useEffect(() => {
    let cancelled = false;
    let made: THREE.BufferGeometry | null = null;
    fetch(DATA_URL)
      .then((res) => (res.ok ? (res.json() as Promise<BuildingsFile>) : Promise.reject(res.status)))
      .then((data) => {
        if (cancelled) return;
        const toScene = new THREE.Vector3();
        const up = new THREE.Vector3(0, 1, 0);
        const parts: THREE.BufferGeometry[] = [];
        for (const b of data.buildings) {
          const ring = b.r;
          let cx = 0;
          let cy = 0;
          for (const [x, y] of ring) {
            cx += x;
            cy += y;
          }
          cx /= ring.length;
          cy /= ring.length;
          if (Math.hypot(cx, cy) > radius) continue;
          // Centroid in the scene frame; skip what sits on the tower's lot.
          toScene.set(cx, 0, -cy).applyAxisAngle(up, rotationY).add(SITE.addressOffset);
          if (Math.abs(toScene.x) < halfX + 3 && Math.abs(toScene.z) < halfZ + 3) continue;

          const area = ringArea(ring);
          if (b.f === undefined && area < MIN_AREA) continue;
          const floors = Math.min(
            b.f ?? estimateFloors(area, hash(cx, cy)),
            maxFloorsAt(Math.hypot(toScene.x, toScene.z)),
          );
          const top = floors * FLOOR_HEIGHT + 0.4;
          const shape = new THREE.Shape(ring.map(([x, y]) => new THREE.Vector2(x, y)));
          const geo = new THREE.ExtrudeGeometry(shape, { depth: top, bevelEnabled: false });
          const count = geo.attributes.position.count;
          geo.setAttribute(
            "aBuilding",
            buildingAttribute(count, hash(cy, cx), floors, top, hash(cx * 0.37, cy * 1.91)),
          );
          parts.push(geo);
        }
        const merged = mergeGeometries(parts, false);
        parts.forEach((g) => g.dispose());
        if (!merged) return;
        // Shape plane (east, north) → ground; extrusion → up.
        merged.rotateX(-Math.PI / 2);
        merged.computeBoundingSphere();
        made = merged;
        setGeometry(merged);
      })
      .catch((error: unknown) => console.warn("[map] buildings unavailable:", error));
    return () => {
      cancelled = true;
      made?.dispose();
    };
  }, [radius, rotationY, halfX, halfZ]);

  const material = useMemo(() => createFacadeMaterial(), []);
  useEffect(() => () => material.dispose(), [material]);

  // Rise out of the plan once the satellite has faded.
  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const rise = smoothstep((blendRef.current.value - 0.3) / 0.7);
    // Never hidden, only flattened: drawing it from the start puts the geometry and shaders on
    // the GPU behind the loader, not in the middle of the descent.
    group.scale.y = Math.max(rise, 0.001);
  });

  if (!geometry) return null;

  return (
    <group position={[SITE.addressOffset.x, 0, SITE.addressOffset.z]} rotation={[0, rotationY, 0]}>
      <group ref={groupRef}>
        <mesh
          geometry={geometry}
          material={material}
          castShadow={!isMobile}
          receiveShadow={!isMobile}
        />
      </group>
    </group>
  );
}
