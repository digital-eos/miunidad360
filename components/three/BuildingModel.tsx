"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type BuildingModelProps = {
  spinning?: boolean;
};

const FLOOR_COUNT = 14;
const FLOOR_HEIGHT = 0.34;

function litRatio(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function WindowGrid({ width, depth }: { width: number; depth: number }) {
  const positions = useMemo(() => {
    const cols = Math.max(2, Math.round(width * 2.4));
    const pts: [number, number, number][] = [];
    for (let floor = 1; floor < FLOOR_COUNT - 1; floor += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (litRatio(floor * 97 + col * 13) > 0.72) continue;
        const x = -width / 2 + 0.3 + (col / (cols - 1)) * (width - 0.6);
        const y = -FLOOR_COUNT * FLOOR_HEIGHT * 0.5 + floor * FLOOR_HEIGHT;
        pts.push([x, y, depth / 2 + 0.01]);
      }
    }
    return pts;
  }, [width, depth]);

  return (
    <group>
      {positions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <planeGeometry args={[0.08, 0.14]} />
          <meshStandardMaterial
            color="#f0a63b"
            emissive="#f0a63b"
            emissiveIntensity={1.4}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function Tower({
  position,
  width,
  depth,
  height,
}: {
  position: [number, number, number];
  width: number;
  depth: number;
  height: number;
}) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#1c1c1f" roughness={0.55} metalness={0.25} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(width, height, depth)]} />
        <lineBasicMaterial color="#f4f2ec" transparent opacity={0.25} />
      </lineSegments>
      <WindowGrid width={width} depth={depth} />
    </group>
  );
}

export function BuildingModel({ spinning = true }: BuildingModelProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!spinning || !groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.12;
  });

  return (
    <group ref={groupRef}>
      <Tower
        position={[0, 0, 0]}
        width={1.6}
        depth={1.6}
        height={FLOOR_COUNT * FLOOR_HEIGHT}
      />
      <Tower
        position={[1.15, -1.05, 0.3]}
        width={1.1}
        depth={1.1}
        height={(FLOOR_COUNT - 4) * FLOOR_HEIGHT}
      />
      <mesh
        position={[0, -FLOOR_COUNT * FLOOR_HEIGHT * 0.5 - 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#efebe3" roughness={1} />
      </mesh>
      <gridHelper
        args={[6, 24, "#8f8a7d", "#d8d4c9"]}
        position={[0, -FLOOR_COUNT * FLOOR_HEIGHT * 0.5, 0]}
      />
    </group>
  );
}
