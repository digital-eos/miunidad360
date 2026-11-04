"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Instance, Instances } from "@react-three/drei";
import { type BuildingConfig, defaultBuildingConfig, seededRandom } from "@/lib/three/building-config";
import { MATERIAL_COLORS } from "@/lib/three/materials";
import { useNightContext } from "./night-context";

type ContextProps = {
  config?: BuildingConfig;
};

type PerimeterPoint = { x: number; z: number; rotationY: number };

/** Evenly-spaced points just outside the plaza rectangle, one per side, skipping corners. */
function perimeterPoints(halfW: number, halfD: number, spacing: number): PerimeterPoint[] {
  const points: PerimeterPoint[] = [];
  const margin = spacing * 0.6;

  for (let x = -halfW + margin; x <= halfW - margin; x += spacing) {
    points.push({ x, z: -halfD, rotationY: 0 });
    points.push({ x, z: halfD, rotationY: Math.PI });
  }
  for (let z = -halfD + margin; z <= halfD - margin; z += spacing) {
    points.push({ x: -halfW, z, rotationY: Math.PI / 2 });
    points.push({ x: halfW, z, rotationY: -Math.PI / 2 });
  }
  return points;
}

export function Context({ config = defaultBuildingConfig }: ContextProps) {
  const { factorRef } = useNightContext();
  const lampGlowRef = useRef<THREE.MeshStandardMaterial>(null);
  const lampLightsRef = useRef<THREE.PointLight[]>([]);

  const plazaHalfW = config.buildingWidth / 2 + 5;
  const plazaHalfD = config.buildingDepth / 2 + 5;

  const treePoints = useMemo(() => perimeterPoints(plazaHalfW + 2.4, plazaHalfD + 2.4, 6.5), [
    plazaHalfW,
    plazaHalfD,
  ]);

  const lampPoints = useMemo(() => perimeterPoints(plazaHalfW + 1.1, plazaHalfD + 1.1, 9), [
    plazaHalfW,
    plazaHalfD,
  ]);

  const neighbors = useMemo(() => {
    const items: { position: [number, number, number]; size: [number, number, number]; color: string }[] =
      [];
    const count = 10;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + seededRandom(i * 3.1) * 0.4;
      const radius = plazaHalfW + 20 + seededRandom(i * 7.7) * 24;
      const width = 6 + seededRandom(i * 1.3) * 7;
      const depth = 6 + seededRandom(i * 2.9) * 7;
      const height = 7 + seededRandom(i * 5.1) * 22;
      const light = seededRandom(i * 9.3) > 0.5;
      items.push({
        position: [Math.cos(angle) * radius, height / 2, Math.sin(angle) * radius],
        size: [width, height, depth],
        color: light ? MATERIAL_COLORS.neighborLight : MATERIAL_COLORS.neighborMid,
      });
    }
    return items;
  }, [plazaHalfW]);

  useFrame(() => {
    const night = factorRef.current;
    if (lampGlowRef.current) {
      lampGlowRef.current.emissiveIntensity = THREE.MathUtils.lerp(0, 2.2, night);
    }
    for (const light of lampLightsRef.current) {
      if (light) light.intensity = THREE.MathUtils.lerp(0, 1.1, night);
    }
  });

  return (
    <group>
      {/* Ground / asphalt */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[260, 260]} />
        <meshStandardMaterial color={MATERIAL_COLORS.roadAsphalt} roughness={1} />
      </mesh>

      {/* Sidewalk plaza under the building */}
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <boxGeometry args={[plazaHalfW * 2, 0.08, plazaHalfD * 2]} />
        <meshStandardMaterial color={MATERIAL_COLORS.sidewalk} roughness={0.95} />
      </mesh>

      {/* Trees */}
      <Instances limit={treePoints.length} range={treePoints.length} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 1.6, 6]} />
        <meshStandardMaterial color={MATERIAL_COLORS.foliageTrunk} roughness={0.9} />
        {treePoints.map((p, i) => {
          const scale = 0.8 + seededRandom(i * 4.2) * 0.4;
          return (
            <Instance
              key={i}
              position={[p.x, 0.8 * scale, p.z]}
              scale={[scale, scale, scale]}
            />
          );
        })}
      </Instances>
      <Instances limit={treePoints.length} range={treePoints.length} castShadow>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={MATERIAL_COLORS.foliage} roughness={0.85} flatShading />
        {treePoints.map((p, i) => {
          const scale = 0.9 + seededRandom(i * 4.2 + 1) * 0.5;
          return (
            <Instance key={i} position={[p.x, 1.7 * scale, p.z]} scale={[scale, scale * 0.9, scale]} />
          );
        })}
      </Instances>

      {/* Neighboring context volumes */}
      <Instances limit={neighbors.length} range={neighbors.length} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={MATERIAL_COLORS.neighborMid} roughness={0.95} />
        {neighbors.map((n, i) => (
          <Instance key={i} position={n.position} scale={n.size} color={n.color} />
        ))}
      </Instances>

      {/* Street lamp poles */}
      <Instances limit={lampPoints.length} range={lampPoints.length} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 3.2, 6]} />
        <meshStandardMaterial color={MATERIAL_COLORS.lampPole} roughness={0.5} metalness={0.6} />
        {lampPoints.map((p, i) => (
          <Instance key={i} position={[p.x, 1.6, p.z]} />
        ))}
      </Instances>
      <Instances limit={lampPoints.length} range={lampPoints.length}>
        <sphereGeometry args={[0.14, 10, 10]} />
        <meshStandardMaterial
          ref={lampGlowRef}
          color={MATERIAL_COLORS.lampGlow}
          emissive={MATERIAL_COLORS.lampGlow}
          emissiveIntensity={0}
          toneMapped={false}
        />
        {lampPoints.map((p, i) => (
          <Instance key={i} position={[p.x, 3.25, p.z]} />
        ))}
      </Instances>

      {/* A handful of real point lights (every 4th lamp) for actual night illumination */}
      {lampPoints
        .filter((_, i) => i % 4 === 0)
        .map((p, i) => (
          <pointLight
            key={i}
            ref={(light) => {
              if (light) lampLightsRef.current[i] = light;
            }}
            position={[p.x, 3.3, p.z]}
            color={MATERIAL_COLORS.lampGlow}
            intensity={0}
            distance={9}
            decay={2}
          />
        ))}
    </group>
  );
}
