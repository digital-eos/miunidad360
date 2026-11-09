"use client";

import { memo, useMemo } from "react";
import * as THREE from "three";
import { Environment, Lightformer } from "@react-three/drei";

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
};

/** Sky radius inside the environment capture (its camera sees up to 1000). */
const RADIUS = 400;

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
}: SunSkyEnvironmentProps) {
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
