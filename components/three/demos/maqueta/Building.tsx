"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Instance, Instances } from "@react-three/drei";
import {
  type BuildingConfig,
  defaultBuildingConfig,
  seededRandom,
  totalBuildingHeight,
} from "@/lib/three/building-config";
import {
  generateApartmentLayout,
  sideNormal,
  type ApartmentLayout,
  type ExteriorSide,
} from "@/lib/three/building-layout";
import { MATERIAL_COLORS } from "@/lib/three/materials";
import { useNightContext } from "./night-context";

export type BuildingProps = {
  config?: BuildingConfig;
  /** Apartment id -> override color (used by the unit selector demo). */
  apartmentColors?: Record<string, string>;
  /** Floor number (1-based) to visually highlight, or null for none. */
  highlightFloor?: number | null;
  hoveredId?: string | null;
  onApartmentClick?: (id: string) => void;
  onApartmentPointerOver?: (id: string) => void;
  onApartmentPointerOut?: (id: string) => void;
  castShadow?: boolean;
};

const SIDE_ROTATION: Record<ExteriorSide, number> = {
  north: 0,
  south: Math.PI,
  east: -Math.PI / 2,
  west: Math.PI / 2,
};

type WindowSlot = {
  position: [number, number, number];
  rotationY: number;
  lit: boolean;
};

type BalconySlot = {
  position: [number, number, number];
  rotationY: number;
  width: number;
};

function facadeWidthFor(apt: ApartmentLayout, side: ExteriorSide): number {
  return side === "north" || side === "south" ? apt.size[0] : apt.size[2];
}

function buildWindowsAndBalconies(
  layouts: ApartmentLayout[],
  config: BuildingConfig,
): { windows: WindowSlot[]; balconies: BalconySlot[] } {
  const windows: WindowSlot[] = [];
  const balconies: BalconySlot[] = [];
  const windowY = 0.08 * config.floorHeight;

  for (const apt of layouts) {
    for (const side of apt.exteriorSides) {
      const [nx, nz] = sideNormal(side);
      const facadeWidth = facadeWidthFor(apt, side);
      const slotCount = Math.max(1, Math.round(facadeWidth / 3.1));
      const margin = facadeWidth * 0.12;
      const usable = facadeWidth - margin * 2;

      for (let i = 0; i < slotCount; i += 1) {
        const t = slotCount === 1 ? 0.5 : i / (slotCount - 1);
        const along = -usable / 2 + t * usable;
        const seed = apt.floor * 1000 + apt.letter.charCodeAt(0) * 37 + side.length * 7 + i * 13;
        const lit = seededRandom(seed) > 0.64;

        const outward = config.windowInset;
        let x: number;
        let z: number;
        if (side === "north" || side === "south") {
          x = apt.position[0] + along;
          z = apt.position[2] + nz * (apt.size[2] / 2 + outward);
        } else {
          x = apt.position[0] + nx * (apt.size[0] / 2 + outward);
          z = apt.position[2] + along;
        }

        windows.push({
          position: [x, apt.position[1] + windowY, z],
          rotationY: SIDE_ROTATION[side],
          lit,
        });
      }

      if (side === apt.balconySide) {
        const balconyWidth = facadeWidth * 0.84;
        const balconyOutward = config.balconyDepth / 2 + 0.05;
        const bx =
          side === "north" || side === "south" ? apt.position[0] : apt.position[0] + nx * balconyOutward;
        const bz =
          side === "north" || side === "south" ? apt.position[2] + nz * balconyOutward : apt.position[2];
        balconies.push({
          position: [bx, apt.position[1] - config.floorHeight * 0.42, bz],
          rotationY: SIDE_ROTATION[side],
          width: balconyWidth,
        });
      }
    }
  }

  return { windows, balconies };
}

export function Building({
  config = defaultBuildingConfig,
  apartmentColors,
  highlightFloor,
  hoveredId,
  onApartmentClick,
  onApartmentPointerOver,
  onApartmentPointerOut,
  castShadow = true,
}: BuildingProps) {
  const { factorRef } = useNightContext();
  const litWindowMaterialRef = useRef<THREE.MeshStandardMaterial>(null);

  const layouts = useMemo(() => generateApartmentLayout(config), [config]);
  const { windows, balconies } = useMemo(
    () => buildWindowsAndBalconies(layouts, config),
    [layouts, config],
  );
  const litWindows = useMemo(() => windows.filter((w) => w.lit), [windows]);

  const height = totalBuildingHeight(config);
  const roofY = height - config.roofParapetHeight / 2;
  const parapetThickness = 0.25;

  useFrame(() => {
    const night = factorRef.current;
    if (litWindowMaterialRef.current) {
      litWindowMaterialRef.current.emissiveIntensity = THREE.MathUtils.lerp(0.15, 2.4, night);
      litWindowMaterialRef.current.opacity = THREE.MathUtils.lerp(0.25, 1, night);
    }
  });

  return (
    <group>
      {/* Ground floor: glazed lobby */}
      <mesh position={[0, config.groundFloorHeight / 2, 0]} receiveShadow castShadow={castShadow}>
        <boxGeometry args={[config.buildingWidth, config.groundFloorHeight, config.buildingDepth]} />
        <meshStandardMaterial
          color={MATERIAL_COLORS.glassGround}
          roughness={0.1}
          metalness={0.3}
          transparent
          opacity={0.55}
        />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[config.buildingWidth + 0.1, 0.1, config.buildingDepth + 0.1]} />
        <meshStandardMaterial color={MATERIAL_COLORS.metalDark} roughness={0.6} metalness={0.5} />
      </mesh>

      {/* Apartments */}
      {layouts.map((apt) => {
        const isHighlighted = highlightFloor != null && apt.floor === highlightFloor;
        const isHovered = hoveredId === apt.id;
        const color = apartmentColors?.[apt.id] ?? MATERIAL_COLORS.concreteLight;
        return (
          <mesh
            key={apt.id}
            position={apt.position}
            userData={{ apartmentId: apt.id, floor: apt.floor, letter: apt.letter }}
            receiveShadow
            castShadow={castShadow}
            onClick={(e) => {
              e.stopPropagation();
              onApartmentClick?.(apt.id);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              onApartmentPointerOver?.(apt.id);
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              onApartmentPointerOut?.(apt.id);
            }}
          >
            <boxGeometry args={apt.size} />
            <meshStandardMaterial
              color={isHovered ? MATERIAL_COLORS.glassGround : color}
              roughness={0.82}
              metalness={0.05}
              emissive={isHighlighted ? MATERIAL_COLORS.windowLitNight : "#000000"}
              emissiveIntensity={isHighlighted ? 0.35 : 0}
            />
          </mesh>
        );
      })}

      {/* Floor slabs */}
      {Array.from({ length: config.floors + 1 }, (_, i) => i).map((i) => {
        const y = config.groundFloorHeight + i * config.floorHeight - config.slabThickness / 2;
        return (
          <mesh key={`slab-${i}`} position={[0, y, 0]} receiveShadow>
            <boxGeometry
              args={[config.buildingWidth + 0.16, config.slabThickness, config.buildingDepth + 0.16]}
            />
            <meshStandardMaterial color={MATERIAL_COLORS.slab} roughness={0.9} />
          </mesh>
        );
      })}

      {/* Windows: base glass pane, always visible */}
      <Instances limit={windows.length} range={windows.length} castShadow={false}>
        <planeGeometry args={[1.4, 1]} />
        <meshStandardMaterial
          color={MATERIAL_COLORS.glass}
          roughness={0.15}
          metalness={0.4}
          side={THREE.DoubleSide}
        />
        {windows.map((w, i) => (
          <Instance key={i} position={w.position} rotation={[0, w.rotationY, 0]} />
        ))}
      </Instances>

      {/* Lit-window overlay, fades/glows in at night */}
      <Instances limit={Math.max(1, litWindows.length)} range={litWindows.length} castShadow={false}>
        <planeGeometry args={[1.2, 1.35]} />
        <meshStandardMaterial
          ref={litWindowMaterialRef}
          color={MATERIAL_COLORS.windowLitNight}
          emissive={MATERIAL_COLORS.windowLitNight}
          emissiveIntensity={0.15}
          transparent
          opacity={0.25}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
        {litWindows.map((w, i) => {
          const [nx, nz] = [Math.sin(w.rotationY), Math.cos(w.rotationY)];
          return (
            <Instance
              key={i}
              position={[w.position[0] + nx * 0.02, w.position[1], w.position[2] + nz * 0.02]}
              rotation={[0, w.rotationY, 0]}
            />
          );
        })}
      </Instances>

      {/* Balcony slabs */}
      <Instances limit={Math.max(1, balconies.length)} range={balconies.length}>
        <boxGeometry args={[1, 0.12, 1]} />
        <meshStandardMaterial color={MATERIAL_COLORS.slab} roughness={0.85} />
        {balconies.map((b, i) => (
          <Instance
            key={i}
            position={b.position}
            rotation={[0, b.rotationY, 0]}
            scale={[b.width, 1, config.balconyDepth]}
          />
        ))}
      </Instances>

      {/* Balcony railings */}
      <Instances limit={Math.max(1, balconies.length)} range={balconies.length}>
        <boxGeometry args={[1, 1, 0.06]} />
        <meshStandardMaterial
          color={MATERIAL_COLORS.metalDark}
          roughness={0.4}
          metalness={0.6}
          transparent
          opacity={0.85}
        />
        {balconies.map((b, i) => {
          const [nx, nz] = [Math.sin(b.rotationY), Math.cos(b.rotationY)];
          return (
            <Instance
              key={i}
              position={[
                b.position[0] + nx * (config.balconyDepth / 2),
                b.position[1] + 0.55,
                b.position[2] + nz * (config.balconyDepth / 2),
              ]}
              rotation={[0, b.rotationY, 0]}
              scale={[b.width, 1, 1]}
            />
          );
        })}
      </Instances>

      {/* Roof slab + parapet */}
      <mesh position={[0, roofY, 0]} receiveShadow castShadow={castShadow}>
        <boxGeometry args={[config.buildingWidth, config.roofParapetHeight, config.buildingDepth]} />
        <meshStandardMaterial color={MATERIAL_COLORS.concreteShadow} roughness={0.9} />
      </mesh>
      {[
        [0, config.buildingDepth / 2, config.buildingWidth, parapetThickness] as const,
        [0, -config.buildingDepth / 2, config.buildingWidth, parapetThickness] as const,
      ].map(([x, z, w, d], i) => (
        <mesh key={`parapet-ns-${i}`} position={[x, height + 0.3, z]}>
          <boxGeometry args={[w, 0.6, d]} />
          <meshStandardMaterial color={MATERIAL_COLORS.metalDark} roughness={0.6} metalness={0.4} />
        </mesh>
      ))}
      {[
        [config.buildingWidth / 2, 0, parapetThickness, config.buildingDepth] as const,
        [-config.buildingWidth / 2, 0, parapetThickness, config.buildingDepth] as const,
      ].map(([x, z, w, d], i) => (
        <mesh key={`parapet-ew-${i}`} position={[x, height + 0.3, z]}>
          <boxGeometry args={[w, 0.6, d]} />
          <meshStandardMaterial color={MATERIAL_COLORS.metalDark} roughness={0.6} metalness={0.4} />
        </mesh>
      ))}
      <mesh position={[config.buildingWidth * 0.18, height + 0.9, config.buildingDepth * 0.15]}>
        <boxGeometry args={[1.8, 1.2, 1.4]} />
        <meshStandardMaterial color={MATERIAL_COLORS.concreteShadow} roughness={0.8} />
      </mesh>
    </group>
  );
}
