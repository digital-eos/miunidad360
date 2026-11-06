"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

type SkyDomeProps = {
  zenith?: string;
  horizon?: string;
  /** Below the horizon; kept close to the horizon so the fogged ground melts into it. */
  ground?: string;
  radius?: number;
};

/**
 * Gradient sky that follows the camera, so it never meets the far plane. Colors are baked
 * into the vertices: cheap, and it works with fog off and the scene's tone mapping.
 */
export function SkyDome({
  zenith = "#86afd1",
  horizon = "#dfe9ee",
  ground = "#d6e1e6",
  radius = 200,
}: SkyDomeProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(radius, 48, 32);
    const top = new THREE.Color(zenith);
    const mid = new THREE.Color(horizon);
    const low = new THREE.Color(ground);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const h = pos.getY(i) / radius;
      if (h >= 0) {
        // Soft curve: most of the gradient sits low on the sky, like a real haze.
        c.copy(mid).lerp(top, Math.pow(h, 0.55));
      } else {
        c.copy(mid).lerp(low, Math.min(1, -h * 4));
      }
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [zenith, horizon, ground, radius]);

  useFrame(({ camera }) => {
    meshRef.current?.position.copy(camera.position);
  });

  return (
    <mesh ref={meshRef} geometry={geometry} renderOrder={-1} frustumCulled={false}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} />
    </mesh>
  );
}
