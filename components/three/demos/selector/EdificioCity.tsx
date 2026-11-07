"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Instance, Instances } from "@react-three/drei";
import { createCityMaterial } from "./city-material";

/**
 * A Palermo-style setting for the Edificio Demo: the tower on a corner plaza, an avenue
 * with a planted median and a park across it (north, the side the camera looks from), a
 * side street to the east and continuous city blocks around. Fixed seed: always the same.
 */

const C = {
  ground: "#dedbd3",
  block: "#d8d4cb",
  plaza: "#e2ddd2",
  asphalt: "#6c7074",
  line: "#f1efe9",
  grass: "#9cb486",
  bed: "#8aa874",
  hedge: "#5f7a50",
  path: "#d9cfbc",
  water: "#79a8b8",
  trunk: "#5a4634",
};

const FOLIAGE = ["#5f7d4f", "#6d8a57", "#4f6b45", "#7a9460", "#58764a"];
const FACADES = ["#ece6db", "#dfd8cb", "#d4cfc6", "#e8e0d2", "#c9c3b8", "#f1ebe1", "#d9cbb8"];
const CAR_COLORS = ["#f2f2f0", "#c9cdd1", "#2b2d31", "#8d939a", "#a33a32", "#2f4a6b", "#e9e6df"];

// Layout (meters). The tower's plaza spans x ±17, z ±13.5.
const PLAZA = { halfX: 17, halfZ: 13.5 };
const AVENUE = { sidewalkFrom: 13.5, roadA: [17, 23.5], median: [23.5, 25.5], roadB: [25.5, 32], farSidewalk: [32, 35] };
const STREET = { sidewalkA: [17, 20.5], road: [20.5, 27.5], sidewalkB: [27.5, 31] };
const EXTENT = 160;
const CURB = 0.15;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Box = { pos: [number, number, number]; size: [number, number, number]; color: string };

/** Box from a ground rectangle: [minX, maxX] × [minZ, maxZ], from y0 up `h`. */
function rectBox(minX: number, maxX: number, minZ: number, maxZ: number, y0: number, h: number) {
  return {
    pos: [(minX + maxX) / 2, y0 + h / 2, (minZ + maxZ) / 2] as [number, number, number],
    size: [maxX - minX, h, maxZ - minZ] as [number, number, number],
  };
}

function layoutBuildings(): Box[] {
  const random = mulberry32(34575843);
  const boxes: Box[] = [];

  // Continuous street frontages, one lot after another (party walls, as in Buenos Aires).
  const frontages: {
    alongX: boolean;
    front: number;
    away: 1 | -1;
    from: number;
    to: number;
    tall?: boolean;
  }[] = [
    { alongX: true, front: PLAZA.halfZ, away: -1, from: -EXTENT, to: -19 },
    { alongX: false, front: PLAZA.halfX, away: -1, from: -EXTENT, to: -15.5 },
    { alongX: false, front: STREET.sidewalkB[1], away: 1, from: -EXTENT, to: PLAZA.halfZ },
    { alongX: true, front: PLAZA.halfZ, away: -1, from: 54, to: EXTENT },
    // Second row, behind the first, taller (skyline).
    { alongX: true, front: -30, away: -1, from: -EXTENT, to: -10, tall: true },
    { alongX: false, front: -36, away: -1, from: -EXTENT, to: -55, tall: true },
    { alongX: false, front: 62, away: 1, from: -EXTENT, to: -12, tall: true },
  ];

  for (const f of frontages) {
    let cursor = f.from;
    while (cursor < f.to - 6) {
      const width = Math.min(8 + random() * 9, f.to - cursor);
      const depth = 14 + random() * 7;
      const floors = f.tall ? 5 + Math.floor(random() * 6) : 3 + Math.floor(random() * 6);
      const h = 3.4 + floors * 3;
      const a = cursor;
      const b = cursor + width;
      const c = f.front;
      const d = f.front + f.away * depth;
      const [minX, maxX, minZ, maxZ] = f.alongX
        ? [a, b, Math.min(c, d), Math.max(c, d)]
        : [Math.min(c, d), Math.max(c, d), a, b];
      const color = FACADES[Math.floor(random() * FACADES.length)];
      boxes.push({ ...rectBox(minX, maxX, minZ, maxZ, CURB, h), color });

      // Some get a set-back penthouse.
      if (random() > 0.55) {
        const inset = 2.2;
        const ph = f.alongX
          ? rectBox(minX + 0.6, maxX - 0.6, minZ + (f.away < 0 ? 0 : inset), maxZ - (f.away < 0 ? inset : 0), CURB + h, 3)
          : rectBox(minX + (f.away < 0 ? 0 : inset), maxX - (f.away < 0 ? inset : 0), minZ + 0.6, maxZ - 0.6, CURB + h, 3);
        boxes.push({ ...ph, color });
      }
      cursor = b;
    }
  }

  // Far skyline beyond the park.
  for (let i = 0; i < 14; i++) {
    const x = -150 + i * 22 + random() * 8;
    const z = 170 + random() * 30;
    const w = 14 + random() * 10;
    const h = 30 + random() * 45;
    boxes.push({
      ...rectBox(x - w / 2, x + w / 2, z - 8, z + 8, 0, h),
      color: FACADES[Math.floor(random() * FACADES.length)],
    });
  }
  return boxes;
}

type Tree = { pos: [number, number, number]; scale: number; color: string };

function layoutTrees(): Tree[] {
  const random = mulberry32(777);
  const trees: Tree[] = [];
  const add = (x: number, z: number, base = 1, y = CURB) =>
    trees.push({
      pos: [x, y, z],
      scale: base * (0.85 + random() * 0.4),
      color: FOLIAGE[Math.floor(random() * FOLIAGE.length)],
    });

  // Street trees along the avenue (both sides) and on the median.
  for (let x = -EXTENT + 4; x < EXTENT; x += 7.5) {
    if (x > 17 && x < 31) continue;
    add(x, 15.3);
    add(x + 3, 33.5);
  }
  for (let x = -EXTENT + 2; x < EXTENT; x += 9) add(x, 24.5, 1.1, 0.35);
  // Along the east street.
  for (let z = -EXTENT + 4; z < 10; z += 7.5) {
    if (z > -16 && z < 12) {
      add(18.8, z, 0.9);
    } else {
      add(18.8, z);
    }
    add(29.3, z + 3);
  }
  // Plaza corners.
  for (const [x, z] of [
    [-14.8, 11.2],
    [14.8, 11.2],
    [-14.8, -11.4],
    [14.8, -11.4],
    [-15.2, 0],
  ]) {
    add(x, z, 1.15, 0.45);
  }
  // Park
  let placed = 0;
  while (placed < 110) {
    const x = -EXTENT + 10 + random() * (EXTENT * 2 - 20);
    const z = 39 + random() * 115;
    const pondDx = (x + 40) / 26;
    const pondDz = (z - 85) / 16;
    if (pondDx * pondDx + pondDz * pondDz < 1.3) continue;
    if (Math.abs(z - 44) < 3) continue; // keep the path clear
    add(x, z, 1.1 + random() * 0.5, 0.05);
    placed++;
  }
  return trees;
}

type Car = { pos: [number, number, number]; rotY: number; color: string };

function layoutCars(): Car[] {
  const random = mulberry32(4242);
  const cars: Car[] = [];
  const lanes: { alongX: boolean; at: number; dir: 1 | -1; from: number; to: number }[] = [
    { alongX: true, at: 18.9, dir: -1, from: -120, to: 120 },
    { alongX: true, at: 21.7, dir: -1, from: -120, to: 120 },
    { alongX: true, at: 27.3, dir: 1, from: -120, to: 120 },
    { alongX: true, at: 30.2, dir: 1, from: -120, to: 120 },
    { alongX: false, at: 22.3, dir: 1, from: -120, to: 8 },
    { alongX: false, at: 25.7, dir: -1, from: -120, to: 8 },
  ];
  for (const lane of lanes) {
    let cursor = lane.from + random() * 20;
    while (cursor < lane.to) {
      const inCrossing = lane.alongX && cursor > 8 && cursor < 38;
      if (!inCrossing) {
        cars.push({
          pos: lane.alongX ? [cursor, 0, lane.at] : [lane.at, 0, cursor],
          rotY: lane.alongX ? (lane.dir > 0 ? 0 : Math.PI) : lane.dir > 0 ? -Math.PI / 2 : Math.PI / 2,
          color: CAR_COLORS[Math.floor(random() * CAR_COLORS.length)],
        });
      }
      cursor += 9 + random() * 26;
    }
  }
  return cars;
}

function Flat({
  minX,
  maxX,
  minZ,
  maxZ,
  y,
  h = 0.02,
  color,
  roughness = 0.95,
}: {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y: number;
  h?: number;
  color: string;
  roughness?: number;
}) {
  const b = rectBox(minX, maxX, minZ, maxZ, y, h);
  return (
    <mesh position={b.pos} receiveShadow>
      <boxGeometry args={b.size} />
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  );
}

function Buildings({ castShadow }: { castShadow: boolean }) {
  const boxes = useMemo(() => layoutBuildings(), []);
  const material = useMemo(() => createCityMaterial(), []);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const color = new THREE.Color();
    boxes.forEach((b, i) => {
      m.compose(
        new THREE.Vector3(...b.pos),
        new THREE.Quaternion(),
        new THREE.Vector3(...b.size),
      );
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, color.set(b.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [boxes]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, material, boxes.length]}
      castShadow={castShadow}
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  );
}

function Trees({ castShadow }: { castShadow: boolean }) {
  const trees = useMemo(() => layoutTrees(), []);
  return (
    <group>
      <Instances limit={trees.length} range={trees.length} castShadow={castShadow}>
        <cylinderGeometry args={[0.13, 0.18, 2.4, 6]} />
        <meshStandardMaterial color={C.trunk} roughness={0.9} />
        {trees.map((t, i) => (
          <Instance
            key={i}
            position={[t.pos[0], t.pos[1] + 1.2 * t.scale, t.pos[2]]}
            scale={[t.scale, t.scale, t.scale]}
          />
        ))}
      </Instances>
      <Instances limit={trees.length} range={trees.length} castShadow={castShadow} receiveShadow>
        <icosahedronGeometry args={[1.7, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} flatShading />
        {trees.map((t, i) => (
          <Instance
            key={i}
            position={[t.pos[0], t.pos[1] + 3.4 * t.scale, t.pos[2]]}
            scale={[t.scale, t.scale * 0.92, t.scale]}
            color={t.color}
          />
        ))}
      </Instances>
    </group>
  );
}

function Cars() {
  const cars = useMemo(() => layoutCars(), []);
  return (
    <group>
      <Instances limit={cars.length} range={cars.length} castShadow>
        <boxGeometry args={[4.3, 0.75, 1.8]} />
        <meshStandardMaterial color="#ffffff" roughness={0.35} metalness={0.4} />
        {cars.map((c, i) => (
          <Instance
            key={i}
            position={[c.pos[0], 0.55, c.pos[2]]}
            rotation={[0, c.rotY, 0]}
            color={c.color}
          />
        ))}
      </Instances>
      <Instances limit={cars.length} range={cars.length}>
        <boxGeometry args={[2.3, 0.62, 1.62]} />
        <meshStandardMaterial color="#20262b" roughness={0.1} metalness={0.3} />
        {cars.map((c, i) => {
          const off = -0.25;
          return (
            <Instance
              key={i}
              position={[
                c.pos[0] + Math.cos(c.rotY) * off,
                1.2,
                c.pos[2] - Math.sin(c.rotY) * off,
              ]}
              rotation={[0, c.rotY, 0]}
            />
          );
        })}
      </Instances>
    </group>
  );
}

function RoadMarkings() {
  const dashes = useMemo(() => {
    const list: { pos: [number, number, number]; size: [number, number] }[] = [];
    const y = 0.025;
    for (let x = -EXTENT; x < EXTENT; x += 6) {
      if (x > 17 && x < 31) continue;
      list.push({ pos: [x, y, (AVENUE.roadA[0] + AVENUE.roadA[1]) / 2], size: [2.6, 0.14] });
      list.push({ pos: [x, y, (AVENUE.roadB[0] + AVENUE.roadB[1]) / 2], size: [2.6, 0.14] });
    }
    for (let z = -EXTENT; z < 8; z += 6) {
      list.push({ pos: [(STREET.road[0] + STREET.road[1]) / 2, y, z], size: [0.14, 2.6] });
    }
    // Zebra crossings: across the side street, and across the avenue at the plaza corner.
    for (let x = STREET.road[0] + 0.4; x < STREET.road[1]; x += 1) {
      list.push({ pos: [x, y, 11], size: [0.5, 3] });
    }
    for (let z = AVENUE.roadA[0] + 0.4; z < AVENUE.roadB[1]; z += 1) {
      if (z > AVENUE.median[0] && z < AVENUE.median[1]) continue;
      list.push({ pos: [13.5, y, z], size: [3, 0.5] });
    }
    return list;
  }, []);

  return (
    <Instances limit={dashes.length} range={dashes.length} receiveShadow>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial color={C.line} roughness={0.8} />
      {dashes.map((d, i) => (
        <Instance
          key={i}
          position={d.pos}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[d.size[0], d.size[1], 1]}
        />
      ))}
    </Instances>
  );
}

function Plaza() {
  const beds: [number, number, number, number][] = [
    [-16.6, -13.6, -8.5, 8.5],
    [13.6, 16.6, -8.5, 8.5],
    [-10, 10, -13.1, -10.6],
    [-12.6, -5.2, 10.6, 13.1],
    [5.2, 12.6, 10.6, 13.1],
  ];
  return (
    <group>
      <Flat
        minX={-PLAZA.halfX}
        maxX={PLAZA.halfX}
        minZ={-PLAZA.halfZ}
        maxZ={PLAZA.halfZ}
        y={0}
        h={CURB + 0.01}
        color={C.plaza}
        roughness={0.9}
      />
      {beds.map(([minX, maxX, minZ, maxZ], i) => (
        <group key={i}>
          <Flat minX={minX} maxX={maxX} minZ={minZ} maxZ={maxZ} y={CURB} h={0.3} color="#cfc8bb" />
          <Flat
            minX={minX + 0.15}
            maxX={maxX - 0.15}
            minZ={minZ + 0.15}
            maxZ={maxZ - 0.15}
            y={CURB + 0.3}
            h={0.02}
            color={C.bed}
            roughness={1}
          />
        </group>
      ))}
      {/* Low hedges along the beds' street side */}
      {[
        [-16.6, -16.1, -8.5, 8.5],
        [16.1, 16.6, -8.5, 8.5],
      ].map(([minX, maxX, minZ, maxZ], i) => (
        <mesh key={i} position={[(minX + maxX) / 2, CURB + 0.75, (minZ + maxZ) / 2]} castShadow>
          <boxGeometry args={[maxX - minX, 0.9, maxZ - minZ]} />
          <meshStandardMaterial color={C.hedge} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function Park() {
  const pond = useMemo(() => {
    const g = new THREE.CircleGeometry(1, 48);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  return (
    <group>
      <Flat minX={-EXTENT} maxX={EXTENT} minZ={AVENUE.farSidewalk[1]} maxZ={EXTENT} y={0} h={0.05} color={C.grass} roughness={1} />
      {/* Path along the park edge */}
      <mesh position={[0, 0.061, 44]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[EXTENT * 2, 2.6]} />
        <meshStandardMaterial color={C.path} roughness={0.95} />
      </mesh>
      {/* Pond */}
      <mesh geometry={pond} position={[-40, 0.07, 85]} scale={[24, 1, 14]} receiveShadow>
        <meshPhysicalMaterial color={C.water} roughness={0.08} envMapIntensity={1.4} />
      </mesh>
    </group>
  );
}

export function EdificioCity({ castShadow = true }: { castShadow?: boolean }) {
  return (
    <group>
      {/* Base ground, melting into the haze */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[900, 900]} />
        <meshStandardMaterial color={C.ground} roughness={1} />
      </mesh>

      {/* Streets */}
      <Flat minX={-EXTENT} maxX={EXTENT} minZ={AVENUE.roadA[0]} maxZ={AVENUE.roadB[1]} y={-0.01} h={0.02} color={C.asphalt} />
      <Flat minX={STREET.road[0]} maxX={STREET.road[1]} minZ={-EXTENT} maxZ={AVENUE.roadA[0]} y={-0.01} h={0.02} color={C.asphalt} />
      <RoadMarkings />

      {/* City blocks (raised: the edge reads as the curb) and sidewalks */}
      <Flat minX={-EXTENT} maxX={STREET.road[0]} minZ={-EXTENT} maxZ={AVENUE.roadA[0]} y={0} h={CURB} color={C.block} />
      <Flat minX={STREET.road[1]} maxX={EXTENT} minZ={-EXTENT} maxZ={AVENUE.roadA[0]} y={0} h={CURB} color={C.block} />
      <Flat minX={-EXTENT} maxX={EXTENT} minZ={AVENUE.farSidewalk[0]} maxZ={AVENUE.farSidewalk[1]} y={0} h={CURB} color={C.block} />
      {/* Planted median */}
      <Flat minX={-EXTENT} maxX={EXTENT} minZ={AVENUE.median[0]} maxZ={AVENUE.median[1]} y={0} h={0.3} color="#cfc8bb" />
      <Flat minX={-EXTENT} maxX={EXTENT} minZ={AVENUE.median[0] + 0.15} maxZ={AVENUE.median[1] - 0.15} y={0.3} h={0.02} color={C.grass} roughness={1} />

      <Plaza />
      <Park />
      <Buildings castShadow={castShadow} />
      <Trees castShadow={castShadow} />
      <Cars />
    </group>
  );
}
