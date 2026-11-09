"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/** Lawn level: the building's plinth starts here. */
export const GROUND_Y = -0.6;

// The oval pool west of the building, as drawn on the ground-floor plan (meters).
const POOL = { x: -27.5, z: 0, rx: 4.6, rz: 6.6 };
const PINE_COUNT = 70;

function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Pines around the lot, kept off the building, the pool and the front lawn. */
function pinePositions() {
  const rand = lcg(7);
  const out: { x: number; z: number; h: number; r: number }[] = [];
  while (out.length < PINE_COUNT) {
    const angle = rand() * Math.PI * 2;
    const dist = 24 + rand() * 46;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const nearPool = Math.hypot((x - POOL.x) / (POOL.rx + 5), (z - POOL.z) / (POOL.rz + 5)) < 1;
    const frontLawn = z > 12 && Math.abs(x) < 20;
    if (nearPool || frontLawn) continue;
    out.push({ x, z, h: 9 + rand() * 9, r: 2.2 + rand() * 1.6 });
  }
  return out;
}

export function ZeusSite() {
  const trunks = useRef<THREE.InstancedMesh>(null);
  const crowns = useRef<THREE.InstancedMesh>(null);
  const pines = useMemo(() => pinePositions(), []);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    pines.forEach((p, i) => {
      const trunkH = p.h * 0.62;
      m.compose(
        new THREE.Vector3(p.x, GROUND_Y + trunkH / 2, p.z),
        q,
        new THREE.Vector3(1, trunkH, 1)
      );
      trunks.current?.setMatrixAt(i, m);
      // Umbrella pine crown: a flattened sphere on top of the trunk.
      m.compose(
        new THREE.Vector3(p.x, GROUND_Y + trunkH + p.r * 0.35, p.z),
        q,
        new THREE.Vector3(p.r, p.r * 0.55, p.r)
      );
      crowns.current?.setMatrixAt(i, m);
    });
    if (trunks.current) trunks.current.instanceMatrix.needsUpdate = true;
    if (crowns.current) crowns.current.instanceMatrix.needsUpdate = true;
  }, [pines]);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={GROUND_Y} receiveShadow>
        <circleGeometry args={[110, 64]} />
        <meshStandardMaterial color="#c9d1b6" roughness={1} />
      </mesh>

      {/* Pool deck and water. */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[POOL.x, GROUND_Y + 0.01, POOL.z]}
        scale={[POOL.rx + 2.2, POOL.rz + 2.2, 1]}
        receiveShadow
      >
        <circleGeometry args={[1, 48]} />
        <meshStandardMaterial color="#e8e2d6" roughness={0.9} />
      </mesh>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[POOL.x, GROUND_Y + 0.03, POOL.z]}
        scale={[POOL.rx, POOL.rz, 1]}
      >
        <circleGeometry args={[1, 48]} />
        <meshStandardMaterial color="#5cc6d0" roughness={0.12} metalness={0.1} />
      </mesh>

      <instancedMesh ref={trunks} args={[undefined, undefined, PINE_COUNT]} castShadow>
        <cylinderGeometry args={[0.14, 0.22, 1, 6]} />
        <meshStandardMaterial color="#6b5443" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, PINE_COUNT]} castShadow>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color="#4f6b45" roughness={1} flatShading />
      </instancedMesh>
    </group>
  );
}
