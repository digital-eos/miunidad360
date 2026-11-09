"use client";

import { memo, useMemo } from "react";
import * as THREE from "three";
import { Environment, Lightformer } from "@react-three/drei";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

type SunSkyEnvironmentProps = {
  /** Direction of the sun, as the scene's directional light position. */
  sun: [number, number, number];
  zenith: string;
  horizon: string;
  /** Sunlit pavement and roofs under the horizon, the warm bounce light. */
  ground: string;
  sunColor: string;
  /** Radiance of the sun disc: its glint on glass, and part of the fill. */
  sunIntensity: number;
  environmentIntensity: number;
  /** A ring of city blocks on the horizon, so glass reflects buildings and not only sky. */
  skyline?: string;
};

/** Sky radius inside the environment capture (its camera sees up to 1000). */
const RADIUS = 400;

/** Deterministic random, so the skyline is the same on every visit. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Blocks 3–12° tall all around, in the given tint with some variation (vertex colors). */
function skylineGeometry(tint: string) {
  const rand = mulberry32(2771);
  const base = new THREE.Color(tint);
  const parts: THREE.BufferGeometry[] = [];
  const ring = RADIUS * 0.85;
  let angle = 0;
  while (angle < Math.PI * 2) {
    const width = (0.03 + rand() * 0.06) * ring;
    const elevation = (3 + rand() * 9) * (Math.PI / 180);
    const top = Math.tan(elevation) * ring;
    const box = new THREE.BoxGeometry(width, top + 40, 20);
    box.translate(0, (top - 40) / 2, -ring);
    box.rotateY(-angle);
    const shade = base.clone().multiplyScalar(0.82 + rand() * 0.3);
    const colors = new Float32Array(box.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) colors.set([shade.r, shade.g, shade.b], i);
    box.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    parts.push(box.toNonIndexed());
    box.dispose();
    angle += width / ring + rand() * 0.01;
  }
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  return merged;
}

/**
 * Image-based lighting made on the spot, matched to the scene: a sky gradient, a warm ground
 * and a bright sun disc exactly where the directional light is, rendered once into an HDR
 * cube map (half float). No download, and reflections on glass agree with the shadows.
 * Memoized: drei captures the environment again whenever its children change, so this only
 * renders when its own props do.
 */
export const SunSkyEnvironment = memo(function SunSkyEnvironment({
  sun,
  zenith,
  horizon,
  ground,
  sunColor,
  sunIntensity,
  environmentIntensity,
  skyline,
}: SunSkyEnvironmentProps) {
  const city = useMemo(() => (skyline ? skylineGeometry(skyline) : null), [skyline]);
  const sky = useMemo(() => {
    const geo = new THREE.SphereGeometry(RADIUS, 48, 24);
    const top = new THREE.Color(zenith);
    const mid = new THREE.Color(horizon);
    const low = new THREE.Color(ground);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const h = pos.getY(i) / RADIUS;
      // Haze low on the sky; the ground turns to pavement just under the horizon.
      if (h >= 0) c.copy(mid).lerp(top, Math.pow(h, 0.55));
      else c.copy(mid).lerp(low, Math.min(1, -h * 8));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [zenith, horizon, ground]);

  const sunPosition = useMemo(() => {
    const v = new THREE.Vector3(...sun).normalize().multiplyScalar(RADIUS * 0.6);
    return [v.x, v.y, v.z] as [number, number, number];
  }, [sun]);

  return (
    <Environment resolution={256} frames={1} environmentIntensity={environmentIntensity}>
      <mesh geometry={sky}>
        <meshBasicMaterial vertexColors side={THREE.BackSide} toneMapped={false} />
      </mesh>
      {city ? (
        <mesh geometry={city}>
          <meshBasicMaterial vertexColors toneMapped={false} />
        </mesh>
      ) : null}
      {/* About 2° across, like a slightly hazy sun. */}
      <Lightformer
        form="circle"
        position={sunPosition}
        scale={RADIUS * 0.6 * 0.035}
        color={sunColor}
        intensity={sunIntensity}
      />
    </Environment>
  );
});
