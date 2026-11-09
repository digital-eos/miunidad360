"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Cloud, Clouds } from "@react-three/drei";

/**
 * Drifting clouds over the 2D map: volumetric puffs between 190 and 330 m (the entrance descent
 * flies past them) and soft cloud shadows sliding across the ground, so the movement also shows
 * from the usual tower view, which looks down and rarely sees the sky.
 * Textures are drawn at runtime: no external assets.
 */

/** Wind along scene +X, meters per second. */
const WIND = 7;
/** Clouds wrap around inside ±HALF_SPAN meters. */
const HALF_SPAN = 1300;
/** Ground covered by one repeat of the shadow texture (meters). */
const SHADOW_TILE = 650;
const SHADOW_SIZE = 2600;

/** Deterministic random, so the sky is the same on every visit. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Soft round puff with a ragged edge, as a data URL (drei's Clouds loads it by URL). */
function puffTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(7);
  for (let i = 0; i < 26; i++) {
    const a = rand() * Math.PI * 2;
    const r = rand() * size * 0.22;
    const x = size / 2 + Math.cos(a) * r;
    const y = size / 2 + Math.sin(a) * r;
    const radius = size * (0.16 + rand() * 0.18);
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, "rgba(255,255,255,0.32)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return canvas.toDataURL("image/png");
}

/** Tileable blotches of shade (black with alpha), wrapped at the edges. */
function shadowTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(11);
  for (let i = 0; i < 9; i++) {
    const cx = rand() * size;
    const cy = rand() * size;
    for (let k = 0; k < 6; k++) {
      const x = cx + (rand() - 0.5) * size * 0.22;
      const y = cy + (rand() - 0.5) * size * 0.14;
      const radius = size * (0.05 + rand() * 0.08);
      // Drawn on the 3 × 3 neighbors too, so the texture tiles without seams.
      for (const dx of [-size, 0, size]) {
        for (const dy of [-size, 0, size]) {
          const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, radius);
          g.addColorStop(0, "rgba(0,0,0,0.7)");
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, size, size);
        }
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(SHADOW_SIZE / SHADOW_TILE, SHADOW_SIZE / SHADOW_TILE);
  return texture;
}

type CloudSpec = {
  seed: number;
  position: [number, number, number];
  bounds: [number, number, number];
  volume: number;
  segments: number;
  opacity: number;
};

/**
 * `near` clouds ring the descent: 110–260 m off its axis and 330–480 m up, so the opening
 * top-down view looks through gaps at the tower and the camera then flies through the layer.
 * The rest are spread over the whole sky, lower.
 */
function cloudSpecs(near: number, far: number, segments: number): CloudSpec[] {
  const rand = mulberry32(2771);
  const specs: CloudSpec[] = [];
  while (specs.length < near + far) {
    let x: number;
    let z: number;
    let y = 200 + rand() * 150;
    if (specs.length < near) {
      const a = (specs.length / near) * Math.PI * 2 + rand() * 0.5;
      const r = 110 + rand() * 150;
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
      y = 330 + rand() * 150;
    } else {
      x = (rand() * 2 - 1) * HALF_SPAN;
      z = (rand() * 2 - 1) * HALF_SPAN;
      if (Math.hypot(x, z) < 230) continue;
    }
    specs.push({
      seed: specs.length + 1,
      position: [x, y, z],
      bounds: [70 + rand() * 60, 10 + rand() * 10, 40 + rand() * 40],
      volume: 50 + rand() * 35,
      segments,
      opacity: 0.75 + rand() * 0.2,
    });
  }
  return specs;
}

export function MapClouds({ isMobile }: { isMobile: boolean }) {
  const puff = useMemo(() => puffTexture(), []);
  const shade = useMemo(() => shadowTexture(), []);
  const specs = useMemo(
    () => (isMobile ? cloudSpecs(6, 6, 10) : cloudSpecs(10, 14, 14)),
    [isMobile],
  );
  const limit = specs.reduce((n, s) => n + s.segments, 0);
  const shadeRef = useRef<THREE.MeshBasicMaterial>(null);
  const groups = useRef<(THREE.Group | null)[]>([]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    for (const group of groups.current) {
      if (!group) continue;
      group.position.x += WIND * dt;
      if (group.position.x > HALF_SPAN) group.position.x -= HALF_SPAN * 2;
    }
    const map = shadeRef.current?.map;
    if (map) map.offset.x -= (WIND * dt) / SHADOW_TILE;
  });

  return (
    <>
      {/* No culling: the instanced puffs move far from the bounds computed on the first frame. */}
      <Clouds
        texture={puff}
        limit={limit}
        material={THREE.MeshLambertMaterial}
        frustumCulled={false}
      >
        {specs.map((spec, i) => (
          <Cloud
            key={spec.seed}
            ref={(group) => {
              groups.current[i] = group;
            }}
            seed={spec.seed}
            position={spec.position}
            bounds={spec.bounds}
            volume={spec.volume}
            segments={spec.segments}
            opacity={spec.opacity}
            // Puffs slowly churn; they fade when the camera flies right through them.
            speed={0.12}
            growth={6}
            fade={60}
            color="#ffffff"
          />
        ))}
      </Clouds>

      {/* Cloud shadows sliding over the map, under the tower's contact shadow. */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <planeGeometry args={[SHADOW_SIZE, SHADOW_SIZE]} />
        <meshBasicMaterial
          ref={shadeRef}
          map={shade}
          transparent
          opacity={0.75}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}
