"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  BALCONY_FLOOR,
  CEILING,
  CENTER,
  FLOORS,
  GLAZING,
  MUEBLES,
  RAILINGS,
  ROOMS,
  WALLS,
  type Block,
  type RoomId,
} from "@/lib/departamentos/cataluna-103";

const PALETTE = {
  wall: "#f3f1ec",
  wallCap: "#2a2b2e",
  floor: "#d8c7b1",
  bathFloor: "#e4e2dd",
  deck: "#9c7a59",
  glass: "#9fb9c4",
  frame: "#1f2023",
  zone: "#2c2c30",
};

const CAP = 0.03;

/** Plan coordinates → scene coordinates (the unit centred on the origin). */
export function toScene(x: number, z: number): [number, number] {
  return [x - CENTER[0], z - CENTER[1]];
}

function blockGeometry(block: Block, defaultY: [number, number]) {
  const [y0, y1] = block.y ?? defaultY;
  const [x, z] = toScene((block.x[0] + block.x[1]) / 2, (block.z[0] + block.z[1]) / 2);
  return {
    position: [x, (y0 + y1) / 2, z] as [number, number, number],
    size: [block.x[1] - block.x[0], y1 - y0, block.z[1] - block.z[0]] as [number, number, number],
  };
}

const noRaycast = () => null;

function Box({
  block,
  color,
  defaultY = [0, CEILING],
  roughness = 0.85,
  castShadow = true,
}: {
  block: Block;
  color: string;
  defaultY?: [number, number];
  roughness?: number;
  castShadow?: boolean;
}) {
  const { position, size } = blockGeometry(block, defaultY);
  return (
    <mesh position={position} castShadow={castShadow} receiveShadow raycast={noRaycast}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  );
}

function Round({ block, color }: { block: Block; color: string }) {
  const { position, size } = blockGeometry(block, [0, 0.4]);
  const radius = Math.min(size[0], size[2]) / 2;
  return (
    <mesh position={position} castShadow receiveShadow raycast={noRaycast}>
      <cylinderGeometry args={[radius, radius, size[1], 28]} />
      <meshStandardMaterial color={color} roughness={0.6} />
    </mesh>
  );
}

/** A wall: white body with a dark cap on top, like the section cut of an architect's plan. */
function Wall({ block }: { block: Block }) {
  const [y0, y1] = block.y ?? [0, CEILING];
  return (
    <>
      <Box block={{ ...block, y: [y0, y1 - CAP] }} color={PALETTE.wall} />
      <Box block={{ ...block, y: [y1 - CAP, y1] }} color={PALETTE.wallCap} castShadow={false} />
    </>
  );
}

function Glazing({ block }: { block: Block }) {
  const { position, size } = blockGeometry(block, [0, CEILING]);
  return (
    <group position={position}>
      <mesh raycast={noRaycast}>
        <boxGeometry args={[size[0], size[1], 0.02]} />
        <meshPhysicalMaterial
          color={PALETTE.glass}
          transparent
          opacity={0.28}
          roughness={0.05}
          metalness={0.1}
          depthWrite={false}
        />
      </mesh>
      {/* Frame: sill, head and the two jambs */}
      {[
        [0, -size[1] / 2 + 0.02, size[0], 0.04],
        [0, size[1] / 2 - 0.02, size[0], 0.04],
        [-size[0] / 2 + 0.02, 0, 0.04, size[1]],
        [size[0] / 2 - 0.02, 0, 0.04, size[1]],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0]} raycast={noRaycast}>
          <boxGeometry args={[w, h, size[2] + 0.02]} />
          <meshStandardMaterial color={PALETTE.frame} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/** Balcony railing: a glass panel under a thin black handrail. */
function Railing({ block }: { block: Block }) {
  const [y0, y1] = block.y ?? [0, 1];
  const { position, size } = blockGeometry({ ...block, y: [y0, y1 - 0.04] }, [0, 1]);
  return (
    <>
      <mesh position={position} raycast={noRaycast}>
        <boxGeometry args={size} />
        <meshPhysicalMaterial
          color={PALETTE.glass}
          transparent
          opacity={0.25}
          roughness={0.05}
          depthWrite={false}
        />
      </mesh>
      <Box block={{ ...block, y: [y1 - 0.04, y1] }} color={PALETTE.frame} roughness={0.4} />
    </>
  );
}

function roomShape(points: [number, number][]) {
  const shape = new THREE.Shape();
  points.forEach(([x, z], i) => {
    const [sx, sz] = toScene(x, z);
    // The shape is drawn in XY and laid flat by rotating -90° about X: y becomes -z.
    if (i === 0) shape.moveTo(sx, -sz);
    else shape.lineTo(sx, -sz);
  });
  shape.closePath();
  return shape;
}

const ZONE_OPACITY = { idle: 0, hovered: 0.16, selected: 0.3 };

/** Clickable floor area of a room; tinted when hovered or selected. */
function RoomZone({
  id,
  points,
  state,
  onSelect,
  onHover,
}: {
  id: RoomId;
  points: [number, number][];
  state: keyof typeof ZONE_OPACITY;
  onSelect: (id: RoomId) => void;
  onHover: (id: RoomId | null) => void;
}) {
  const geometry = useMemo(() => new THREE.ShapeGeometry(roomShape(points)), [points]);
  const material = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((_, delta) => {
    const m = material.current;
    if (!m) return;
    m.opacity = THREE.MathUtils.damp(m.opacity, ZONE_OPACITY[state], 10, delta);
  });

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.012, 0]}
      renderOrder={1}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(id);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHover(null);
      }}
    >
      <meshBasicMaterial
        ref={material}
        color={PALETTE.zone}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  );
}

export function DepartamentoModel({
  hoveredRoom,
  selectedRoom,
  onSelectRoom,
  onHoverRoom,
}: {
  hoveredRoom: RoomId | null;
  selectedRoom: RoomId | null;
  onSelectRoom: (id: RoomId) => void;
  onHoverRoom: (id: RoomId | null) => void;
}) {
  return (
    <group>
      {/* Floors: porcelain "wood" in the unit, stone in the bathroom, deck on the balcony */}
      {FLOORS.map((block, i) => (
        <Box key={i} block={{ ...block, y: [-0.12, 0] }} color={PALETTE.floor} castShadow={false} />
      ))}
      <Box
        block={{ x: [0, 1.51], z: [1.9, 4.0], y: [0, 0.004] }}
        color={PALETTE.bathFloor}
        castShadow={false}
      />
      <Box block={{ ...BALCONY_FLOOR, y: [-0.14, -0.02] }} color={PALETTE.deck} castShadow={false} />

      {WALLS.map((block, i) => (
        <Wall key={i} block={block} />
      ))}
      {GLAZING.map((block, i) => (
        <Glazing key={i} block={block} />
      ))}
      {RAILINGS.map((block, i) => (
        <Railing key={i} block={block} />
      ))}

      {MUEBLES.map((m, i) =>
        m.kind === "round" ? (
          <Round key={i} block={m.block} color={m.color} />
        ) : (
          <Box key={i} block={m.block} color={m.color} defaultY={[0, 0.5]} />
        ),
      )}

      {ROOMS.map((room) => (
        <RoomZone
          key={room.id}
          id={room.id}
          points={room.piso}
          state={
            selectedRoom === room.id ? "selected" : hoveredRoom === room.id ? "hovered" : "idle"
          }
          onSelect={onSelectRoom}
          onHover={onHoverRoom}
        />
      ))}
    </group>
  );
}
