"use client";

import { Text } from "@react-three/drei";
import { MATERIAL_COLORS } from "@/lib/three/materials";

export type SunCompassProps = {
  /** World position for the compass, usually just outside the plaza. */
  position: [number, number, number];
};

const MARKS: { label: string; dx: number; dz: number }[] = [
  { label: "N", dx: 0, dz: 1 },
  { label: "S", dx: 0, dz: -1 },
  { label: "E", dx: 1, dz: 0 },
  { label: "O", dx: -1, dz: 0 },
];

/** A small, discrete ground compass rose — always world-aligned (+Z = north). */
export function SunCompass({ position }: SunCompassProps) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.55, 0.68, 32]} />
        <meshBasicMaterial color={MATERIAL_COLORS.metalDark} transparent opacity={0.85} />
      </mesh>
      {/* North needle */}
      <mesh position={[0, 0.03, 0.3]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.07, 0.02, 0.55]} />
        <meshBasicMaterial color={MATERIAL_COLORS.hoverGlow} />
      </mesh>
      {MARKS.map((mark) => (
        <Text
          key={mark.label}
          position={[mark.dx * 0.9, 0.04, mark.dz * 0.9]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={mark.label === "N" ? 0.32 : 0.22}
          color={mark.label === "N" ? MATERIAL_COLORS.hoverGlow : MATERIAL_COLORS.metalDark}
          anchorX="center"
          anchorY="middle"
        >
          {mark.label}
        </Text>
      ))}
    </group>
  );
}
