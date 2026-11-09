"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { SITE } from "@/lib/geo/site";
import type { MapBlend } from "./MapGround";
import { createStreetMaterial, STREET_LAYER } from "./street-material";

/**
 * The streets around the lot, built from OpenStreetMap centerlines (extracted once into
 * public/geo/streets/ by scripts/extract-streets.mjs). Three flat layers, one draw call:
 * - sidewalk: the road widened by the sidewalk on each side (paving tiles);
 * - curb: the road widened by 25 cm, a light outline left between road and sidewalk;
 * - road: asphalt, gutters, lane lines and zebra crossings before each intersection
 *   (street-material.ts).
 * Each layer is made of one strip per segment plus a disc at every vertex, so bends and
 * intersections close on their own: higher layers simply cover lower ones.
 * Same frame as MapBuildings: +X east, −Z north, turned to the facade bearing.
 */

const DATA_URL = "/geo/streets/cataluna-ii.json";
const DEG = Math.PI / 180;
const DISC_SEGMENTS = 14;
const CURB = 0.25;

type Way = {
  k: string;
  o: 0 | 1;
  w: number | null;
  l: number | null;
  p: [number, number][];
};
type StreetsFile = { ways: Way[] };

/** Half road width (curb to curb) and sidewalk width, in meters. */
export function streetProfile(way: Pick<Way, "k" | "w">): { half: number; sidewalk: number } {
  if (way.w) return { half: way.w / 2, sidewalk: way.k === "primary" ? 4 : 3 };
  switch (way.k) {
    case "primary":
      return { half: 7, sidewalk: 4 };
    case "secondary":
      return { half: 6, sidewalk: 3.5 };
    case "tertiary":
      return { half: 5, sidewalk: 3 };
    case "living_street":
      return { half: 3.5, sidewalk: 2.5 };
    default:
      return { half: 4.5, sidewalk: 3 };
  }
}

const key = ([x, y]: [number, number]) => `${x.toFixed(1)},${y.toFixed(1)}`;

/** Lane markings: none on one-way residential streets (as in Mar del Plata). */
function markingKind(way: Way, half: number): number {
  if (!way.o && half >= 4.5 && way.k !== "residential") return 1; // dashed center line
  if (way.o && half >= 6) return 2; // dashed lane lines
  return 0;
}

class Builder {
  position: number[] = [];
  street: number[] = [];
  mark: number[] = [];
  index: number[] = [];

  private vertex(x: number, north: number, y: number, street: number[], mark: number[]) {
    // Map frame: east → +X, north → −Z.
    this.position.push(x, y, -north);
    this.street.push(...street);
    this.mark.push(...mark);
    return this.position.length / 3 - 1;
  }

  /** Strip from a to b, half width `half`; u runs across (m), s along (m from a). */
  strip(
    a: [number, number],
    b: [number, number],
    half: number,
    y: number,
    roadHalf: number,
    mark: number[],
  ) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const length = Math.hypot(dx, dy);
    if (length < 0.05) return;
    const nx = -dy / length;
    const ny = dx / length;
    const v = (p: [number, number], side: number, s: number) =>
      this.vertex(p[0] + nx * half * side, p[1] + ny * half * side, y, [half * side, s, length, roadHalf], mark);
    const i0 = v(a, -1, 0);
    const i1 = v(a, 1, 0);
    const i2 = v(b, 1, length);
    const i3 = v(b, -1, length);
    // Counter-clockwise seen from above (+Y), with −Z as north.
    this.index.push(i0, i2, i1, i0, i3, i2);
  }

  disc(c: [number, number], radius: number, y: number, roadHalf: number, layer: number) {
    const mark = [layer, 0, 0, 0];
    const center = this.vertex(c[0], c[1], y, [0, 0, 0, roadHalf], mark);
    const first = this.position.length / 3;
    for (let i = 0; i < DISC_SEGMENTS; i++) {
      const a = (i / DISC_SEGMENTS) * Math.PI * 2;
      // u = 0: joints are plain asphalt (they mostly hide under the strips anyway).
      this.vertex(c[0] + Math.cos(a) * radius, c[1] + Math.sin(a) * radius, y, [0, 0, 0, roadHalf], mark);
    }
    for (let i = 0; i < DISC_SEGMENTS; i++) {
      this.index.push(center, first + i, first + ((i + 1) % DISC_SEGMENTS));
    }
  }

  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.position, 3));
    const normals = new Float32Array(this.position.length);
    for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
    g.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
    g.setAttribute("aStreet", new THREE.Float32BufferAttribute(this.street, 4));
    g.setAttribute("aMark", new THREE.Float32BufferAttribute(this.mark, 4));
    g.setIndex(this.index);
    g.computeBoundingSphere();
    return g;
  }
}

function buildStreets(data: StreetsFile, radius: number) {
  const ways = data.ways.filter((w) => w.k !== "pedestrian");

  // Intersections: vertices where three or more segments meet, cleared to the widest road there.
  const degree = new Map<string, number>();
  const widest = new Map<string, number>();
  for (const way of ways) {
    const { half } = streetProfile(way);
    way.p.forEach((p, i) => {
      const k = key(p);
      const links = (i > 0 ? 1 : 0) + (i < way.p.length - 1 ? 1 : 0);
      degree.set(k, (degree.get(k) ?? 0) + links);
      widest.set(k, Math.max(widest.get(k) ?? 0, half));
    });
  }
  const clearAt = (p: [number, number]) =>
    (degree.get(key(p)) ?? 0) >= 3 ? (widest.get(key(p)) ?? 0) : 0;

  const b = new Builder();
  const near = (p: [number, number]) => Math.hypot(p[0], p[1]) < radius;
  // Long straight streets may have both ends far away while passing right by the lot.
  const segmentNear = (a: [number, number], b: [number, number]) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const t = THREE.MathUtils.clamp(-(a[0] * dx + a[1] * dy) / (dx * dx + dy * dy || 1), 0, 1);
    return Math.hypot(a[0] + t * dx, a[1] + t * dy) < radius;
  };
  for (const way of ways) {
    const { half, sidewalk } = streetProfile(way);
    const kind = markingKind(way, half);
    for (let i = 0; i < way.p.length - 1; i++) {
      const p0 = way.p[i];
      const p1 = way.p[i + 1];
      if (!segmentNear(p0, p1)) continue;
      const roadMark = [STREET_LAYER.road, clearAt(p0), clearAt(p1), kind];
      b.strip(p0, p1, half + sidewalk, STREET_LAYER.heights.sidewalk, half, [STREET_LAYER.sidewalk, 0, 0, 0]);
      b.strip(p0, p1, half + CURB, STREET_LAYER.heights.curb, half, [STREET_LAYER.curb, 0, 0, 0]);
      b.strip(p0, p1, half, STREET_LAYER.heights.road, half, roadMark);
    }
    for (const p of way.p) {
      if (!near(p)) continue;
      b.disc(p, half + sidewalk, STREET_LAYER.heights.sidewalk, half, STREET_LAYER.sidewalk);
      b.disc(p, half + CURB, STREET_LAYER.heights.curb, half, STREET_LAYER.curb);
      b.disc(p, half, STREET_LAYER.heights.roadJoint, half, STREET_LAYER.road);
    }
  }
  return b.geometry();
}

function smoothstep(t: number) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

export function MapStreets({
  blendRef,
  isMobile,
}: {
  blendRef: RefObject<MapBlend>;
  isMobile: boolean;
}) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const rotationY = (SITE.facadeBearing + 180) * DEG;
  const radius = isMobile ? 420 : 650;

  useEffect(() => {
    let cancelled = false;
    let made: THREE.BufferGeometry | null = null;
    fetch(DATA_URL)
      .then((res) => (res.ok ? (res.json() as Promise<StreetsFile>) : Promise.reject(res.status)))
      .then((data) => {
        if (cancelled) return;
        made = buildStreets(data, radius);
        setGeometry(made);
      })
      .catch((error: unknown) => console.warn("[map] streets unavailable:", error));
    return () => {
      cancelled = true;
      made?.dispose();
    };
  }, [radius]);

  const material = useMemo(() => createStreetMaterial(), []);
  useEffect(() => () => material.dispose(), [material]);

  // Fades in over the satellite photo as the street plan takes over.
  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    // Never hidden, only transparent: the shader compiles behind the loader, not mid-descent.
    (mesh.material as THREE.MeshStandardMaterial).opacity = smoothstep(
      (blendRef.current.value - 0.2) / 0.5,
    );
  });

  if (!geometry) return null;

  return (
    <group position={[SITE.addressOffset.x, 0, SITE.addressOffset.z]} rotation={[0, rotationY, 0]}>
      {/* Drawn before the clouds and their shadows, which are transparent too. */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        receiveShadow={!isMobile}
        renderOrder={-1}
      />
    </group>
  );
}
