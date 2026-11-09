"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { SITE } from "@/lib/geo/site";
import type { MapBlend } from "./MapGround";
import { streetProfile } from "./MapStreets";

/**
 * Trees and gardens around the lot, placed from the same data as the streets and buildings:
 * - street trees along both sidewalks, every 8–10 m, none at intersections or before the
 *   tower's front (the entrance stays in view);
 * - gardens in the block interiors: lawn patches with a few trees, only where there is
 *   neither a building nor a street.
 * All trees are two instanced meshes (trunks, crowns), the lawns a third: three draw calls.
 * They grow out of the plan with the buildings during the entrance descent.
 * Same frame as MapBuildings: +X east, −Z north, turned to the facade bearing.
 */

const STREETS_URL = "/geo/streets/cataluna-ii.json";
const BUILDINGS_URL = "/geo/buildings/cataluna-ii.json";
const DEG = Math.PI / 180;

type Way = { k: string; o: 0 | 1; w: number | null; l: number | null; p: [number, number][] };
type Pt = [number, number];

/** Deterministic random, so the trees stand in the same places on every visit. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(t: number) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

/** Uniform grid over the map frame, for "is there a building / a street here?" lookups. */
class Grid<T> {
  private cells = new Map<string, T[]>();
  constructor(private size: number) {}
  private key(i: number, j: number) {
    return `${i},${j}`;
  }
  add(item: T, minX: number, minY: number, maxX: number, maxY: number) {
    for (let i = Math.floor(minX / this.size); i <= Math.floor(maxX / this.size); i++) {
      for (let j = Math.floor(minY / this.size); j <= Math.floor(maxY / this.size); j++) {
        const k = this.key(i, j);
        const list = this.cells.get(k);
        if (list) list.push(item);
        else this.cells.set(k, [item]);
      }
    }
  }
  at(x: number, y: number): T[] {
    return this.cells.get(this.key(Math.floor(x / this.size), Math.floor(y / this.size))) ?? [];
  }
}

function insideRing(x: number, y: number, ring: Pt[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

type Segment = { a: Pt; b: Pt; reach: number };

function segmentDistance(x: number, y: number, { a, b }: Segment) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = THREE.MathUtils.clamp(((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(a[0] + t * dx - x, a[1] + t * dy - y);
}

/** Tree: position in the map frame (east, north), size, crown tint. */
type Tree = { x: number; y: number; scale: number; tint: number; lean: number };
type Lawn = { x: number; y: number; radius: number };

function placeVegetation(
  ways: Way[],
  rings: Pt[][],
  options: { streetRadius: number; gardenRadius: number; keepOut: (x: number, y: number) => boolean },
) {
  const rand = mulberry32(2771);
  const buildings = new Grid<Pt[]>(20);
  for (const ring of rings) {
    const xs = ring.map((p) => p[0]);
    const ys = ring.map((p) => p[1]);
    buildings.add(ring, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
  }
  const inBuilding = (x: number, y: number, margin = 0) =>
    buildings.at(x, y).some((r) => insideRing(x, y, r)) ||
    (margin > 0 &&
      [
        [margin, 0],
        [-margin, 0],
        [0, margin],
        [0, -margin],
      ].some(([dx, dy]) => buildings.at(x + dx, y + dy).some((r) => insideRing(x + dx, y + dy, r))));

  const streets = new Grid<Segment>(25);
  const roads = ways.filter((w) => w.k !== "pedestrian");
  // Intersections (three or more segments meeting): no trees right at the corner.
  const degree = new Map<string, number>();
  const key = ([x, y]: Pt) => `${x.toFixed(1)},${y.toFixed(1)}`;
  for (const way of roads) {
    way.p.forEach((p, i) => {
      const links = (i > 0 ? 1 : 0) + (i < way.p.length - 1 ? 1 : 0);
      degree.set(key(p), (degree.get(key(p)) ?? 0) + links);
    });
  }
  for (const way of roads) {
    const { half, sidewalk } = streetProfile(way);
    for (let i = 0; i < way.p.length - 1; i++) {
      const a = way.p[i];
      const b = way.p[i + 1];
      const reach = half + sidewalk;
      streets.add(
        { a, b, reach },
        Math.min(a[0], b[0]) - reach,
        Math.min(a[1], b[1]) - reach,
        Math.max(a[0], b[0]) + reach,
        Math.max(a[1], b[1]) + reach,
      );
    }
  }
  const nearStreet = (x: number, y: number, extra: number) =>
    streets.at(x, y).some((s) => segmentDistance(x, y, s) < s.reach + extra);

  const trees: Tree[] = [];
  const lawns: Lawn[] = [];

  // Street trees: in the sidewalk, 0.9 m from the curb.
  for (const way of roads) {
    const { half } = streetProfile(way);
    // Avenues and residential streets alike are lined with trees in this part of town.
    for (let i = 0; i < way.p.length - 1; i++) {
      const a = way.p[i];
      const b = way.p[i + 1];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const length = Math.hypot(dx, dy);
      if (length < 1) continue;
      const nx = -dy / length;
      const ny = dx / length;
      const startClear = (degree.get(key(a)) ?? 0) >= 3 ? 12 : 2;
      const endClear = (degree.get(key(b)) ?? 0) >= 3 ? 12 : 2;
      for (const side of [-1, 1]) {
        let s = startClear + rand() * 4;
        while (s < length - endClear) {
          const t = s / length;
          const off = half + 0.9;
          const x = a[0] + dx * t + nx * off * side;
          const y = a[1] + dy * t + ny * off * side;
          s += 8 + rand() * 2.5;
          // Some gaps: driveways, missing trees.
          if (rand() < 0.18) continue;
          if (Math.hypot(x, y) > options.streetRadius || options.keepOut(x, y)) continue;
          if (inBuilding(x, y, 1.2)) continue;
          trees.push({ x, y, scale: 0.85 + rand() * 0.4, tint: rand(), lean: rand() });
        }
      }
    }
  }

  // Gardens in the block interiors.
  const step = 9;
  const r = options.gardenRadius;
  for (let gx = -r; gx <= r; gx += step) {
    for (let gy = -r; gy <= r; gy += step) {
      const x = gx + (rand() - 0.5) * step * 0.8;
      const y = gy + (rand() - 0.5) * step * 0.8;
      const pick = rand();
      if (Math.hypot(x, y) > r || options.keepOut(x, y)) continue;
      if (nearStreet(x, y, 2.5) || inBuilding(x, y, 2.5)) continue;
      if (pick < 0.6) lawns.push({ x, y, radius: 3 + rand() * 3 });
      if (pick < 0.25) trees.push({ x, y, scale: 0.9 + rand() * 0.6, tint: rand(), lean: rand() });
    }
  }
  return { trees, lawns };
}

/** A lumpy canopy: a squashed sphere pushed in and out, so trees don't read as balls. */
function crownGeometry() {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const bump = 1 + 0.16 * Math.sin(v.x * 5.1 + v.y * 3.3) * Math.cos(v.z * 4.7 - v.y * 2.1);
    v.multiplyScalar(bump);
    v.y *= 0.82;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  // Weld the faces (the bumps depend on position only, so seams stay closed) for soft shading.
  geo.deleteAttribute("normal");
  geo.deleteAttribute("uv");
  const smooth = mergeVertices(geo);
  geo.dispose();
  smooth.computeVertexNormals();
  return smooth;
}

const CROWN_TINTS = ["#5d7b43", "#6b8649", "#4f6b3c", "#77904d", "#647d3f"].map(
  (c) => new THREE.Color(c),
);
const LAWN_TINT = new THREE.Color("#a4b47f");

export function MapVegetation({
  blendRef,
  footprint,
  isMobile,
}: {
  blendRef: RefObject<MapBlend>;
  footprint: { halfX: number; halfZ: number };
  isMobile: boolean;
}) {
  const [placed, setPlaced] = useState<{ trees: Tree[]; lawns: Lawn[] } | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const trunksRef = useRef<THREE.InstancedMesh>(null);
  const crownsRef = useRef<THREE.InstancedMesh>(null);
  const lawnsRef = useRef<THREE.InstancedMesh>(null);
  const rotationY = (SITE.facadeBearing + 180) * DEG;
  const { halfX, halfZ } = footprint;
  const streetRadius = isMobile ? 200 : 300;
  const gardenRadius = isMobile ? 150 : 220;

  useEffect(() => {
    let cancelled = false;
    const up = new THREE.Vector3(0, 1, 0);
    const toScene = new THREE.Vector3();
    // Keep the tower's lot and the sidewalk in front of it clear.
    const keepOut = (x: number, y: number) => {
      toScene.set(x, 0, -y).applyAxisAngle(up, rotationY).add(SITE.addressOffset);
      return Math.abs(toScene.x) < halfX + 10 && toScene.z > -halfZ - 4 && toScene.z < halfZ + 14;
    };
    Promise.all([
      fetch(STREETS_URL).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
      fetch(BUILDINGS_URL).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
    ])
      .then(([streets, buildings]: [{ ways: Way[] }, { buildings: { r: Pt[] }[] }]) => {
        if (cancelled) return;
        const rings = buildings.buildings
          .map((b) => b.r)
          .filter((ring) => Math.hypot(ring[0][0], ring[0][1]) < streetRadius + 60);
        setPlaced(placeVegetation(streets.ways, rings, { streetRadius, gardenRadius, keepOut }));
      })
      .catch((error: unknown) => console.warn("[map] vegetation unavailable:", error));
    return () => {
      cancelled = true;
    };
  }, [rotationY, halfX, halfZ, streetRadius, gardenRadius]);

  const geometries = useMemo(
    () => ({
      trunk: new THREE.CylinderGeometry(0.14, 0.2, 1, 5, 1, true).translate(0, 0.5, 0),
      crown: crownGeometry(),
      lawn: new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2),
    }),
    [],
  );
  const materials = useMemo(
    () => ({
      trunk: new THREE.MeshStandardMaterial({ color: "#6e5d4c", roughness: 0.95 }),
      crown: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9 }),
      lawn: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1, transparent: true }),
    }),
    [],
  );
  useEffect(
    () => () => {
      Object.values(geometries).forEach((g) => g.dispose());
      Object.values(materials).forEach((m) => m.dispose());
    },
    [geometries, materials],
  );

  // Tint buffers, made once per placement (a new array each render would reset the tints).
  const tints = useMemo(
    () =>
      placed
        ? {
            trees: new Float32Array(Math.max(placed.trees.length, 1) * 3).fill(1),
            lawns: new Float32Array(Math.max(placed.lawns.length, 1) * 3).fill(1),
          }
        : null,
    [placed],
  );

  // Instance matrices and tints, once placed. Map frame (east, north) → group (x, −z).
  useEffect(() => {
    const trunks = trunksRef.current;
    const crowns = crownsRef.current;
    const lawns = lawnsRef.current;
    if (!placed || !trunks || !crowns || !lawns) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const color = new THREE.Color();
    placed.trees.forEach((tree, i) => {
      const height = 7 * tree.scale;
      const trunkHeight = height * 0.42;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), tree.lean * Math.PI * 2);
      m.compose(p.set(tree.x, 0, -tree.y), q, s.set(tree.scale, trunkHeight, tree.scale));
      trunks.setMatrixAt(i, m);
      const crownSize = height * 0.36;
      m.compose(
        p.set(tree.x, trunkHeight + crownSize * 0.7, -tree.y),
        q,
        s.set(crownSize, crownSize, crownSize),
      );
      crowns.setMatrixAt(i, m);
      color.copy(CROWN_TINTS[Math.floor(tree.tint * CROWN_TINTS.length)]);
      color.multiplyScalar(0.92 + tree.lean * 0.16);
      crowns.setColorAt(i, color);
    });
    placed.lawns.forEach((lawn, i) => {
      m.compose(p.set(lawn.x, 0.03, -lawn.y), q.identity(), s.set(lawn.radius, 1, lawn.radius));
      lawns.setMatrixAt(i, m);
      lawns.setColorAt(i, color.copy(LAWN_TINT).multiplyScalar(0.94 + (i % 7) * 0.02));
    });
    for (const mesh of [trunks, crowns, lawns]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [placed]);

  // Trees grow out of the ground with the buildings once the satellite has faded (buried below
  // the map before that, still drawn so their shaders compile behind the loader); lawns fade in
  // with the streets.
  useFrame(() => {
    const blend = blendRef.current.value;
    const group = groupRef.current;
    if (group) {
      const rise = smoothstep((blend - 0.3) / 0.7);
      group.scale.y = Math.max(rise, 0.05);
      group.position.y = -12 * (1 - rise);
    }
    const lawns = lawnsRef.current;
    if (lawns) (lawns.material as THREE.MeshStandardMaterial).opacity = smoothstep((blend - 0.2) / 0.5);
  });

  if (!placed || !tints) return null;

  return (
    <group position={[SITE.addressOffset.x, 0, SITE.addressOffset.z]} rotation={[0, rotationY, 0]}>
      <instancedMesh
        ref={lawnsRef}
        args={[geometries.lawn, materials.lawn, Math.max(placed.lawns.length, 1)]}
        receiveShadow={!isMobile}
        renderOrder={-1}
      >
        {/* Tint buffers exist from the first frame, so the shader is built with them. */}
        <instancedBufferAttribute
          attach="instanceColor"
          args={[tints.lawns, 3]}
        />
      </instancedMesh>
      <group ref={groupRef}>
        <instancedMesh
          ref={trunksRef}
          args={[geometries.trunk, materials.trunk, Math.max(placed.trees.length, 1)]}
          castShadow={!isMobile}
        />
        <instancedMesh
          ref={crownsRef}
          args={[geometries.crown, materials.crown, Math.max(placed.trees.length, 1)]}
          castShadow={!isMobile}
          receiveShadow={!isMobile}
        >
          <instancedBufferAttribute
            attach="instanceColor"
            args={[tints.trees, 3]}
          />
        </instancedMesh>
      </group>
    </group>
  );
}
