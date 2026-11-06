"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { isInRenderSightline } from "@/lib/bim/render-camera";

/**
 * A low-rise residential block around the project, in a plain "maqueta" style so the real
 * building stands out. Generated from a fixed seed: always the same neighborhood.
 */

/** Grade level of the BIM model (its ground floor slab sits ~1.3 m above the model origin). */
export const GROUND_Y = 1.35;

const COLORS = {
  ground: "#E4E1D9",
  house: "#F1EFEA",
  roof: "#D4D4D0",
  asphalt: "#8E9296",
  sidewalk: "#D9D6CF",
  stripe: "#F4F4F1",
  grass: "#9DB487",
  hedge: "#6F8A5E",
  dirt: "#B4A288",
};

// Building footprint half-sizes (the model is centered on the origin).
const SITE_HALF_X = 12;
const SITE_HALF_Z = 12.3;
/** Nothing of the neighborhood closer than this to the building. */
const MIN_CLEARANCE = 12;
const MAX_HOUSE_HEIGHT = 9;

// Two streets crossing south-east of the project: one along X, one along Z.
const STREET_OFFSET = 31;
const ASPHALT_W = 7;
const SIDEWALK_W = 2.2;
const STREET_LENGTH = 220;
// The project's garden, up to the sidewalks.
const LOT = {
  minX: -22,
  maxX: STREET_OFFSET - ASPHALT_W / 2 - SIDEWALK_W,
  minZ: -22,
  maxZ: STREET_OFFSET - ASPHALT_W / 2 - SIDEWALK_W,
};
// Excavation shown in "avance" mode, where the foundations are below grade.
const PIT = { halfX: SITE_HALF_X + 1.5, halfZ: SITE_HALF_Z + 1.5 };

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

type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };

function rectsOverlap(a: Rect, b: Rect, margin = 0) {
  return (
    a.minX < b.maxX + margin &&
    a.maxX > b.minX - margin &&
    a.minZ < b.maxZ + margin &&
    a.maxZ > b.minZ - margin
  );
}

/** True when part of the footprint stands between the render camera and the building. */
function blocksRenderView(r: Rect) {
  const xs = [r.minX, (r.minX + r.maxX) / 2, r.maxX];
  const zs = [r.minZ, (r.minZ + r.maxZ) / 2, r.maxZ];
  return xs.some((x) => zs.some((z) => isInRenderSightline(x, z, 1)));
}

function distanceToSite(r: Rect) {
  const dx = Math.max(-SITE_HALF_X - r.maxX, 0, r.minX - SITE_HALF_X);
  const dz = Math.max(-SITE_HALF_Z - r.maxZ, 0, r.minZ - SITE_HALF_Z);
  return Math.hypot(dx, dz);
}

const STREET_RECTS: Rect[] = [
  // Street along X (south) and along Z (east), sidewalks included.
  {
    minX: -STREET_LENGTH / 2,
    maxX: STREET_LENGTH / 2,
    minZ: STREET_OFFSET - ASPHALT_W / 2 - SIDEWALK_W,
    maxZ: STREET_OFFSET + ASPHALT_W / 2 + SIDEWALK_W,
  },
  {
    minX: STREET_OFFSET - ASPHALT_W / 2 - SIDEWALK_W,
    maxX: STREET_OFFSET + ASPHALT_W / 2 + SIDEWALK_W,
    minZ: -STREET_LENGTH / 2,
    maxZ: STREET_LENGTH / 2,
  },
];

/** Gable roof over a w × d footprint, ridge along X, eaves at y = 0. */
function gableRoof(w: number, d: number, rise: number, overhang: number) {
  const hw = w / 2 + overhang;
  const hd = d / 2 + overhang;
  const v = (x: number, y: number, z: number) => [x, y, z];
  const a = v(-hw, 0, -hd);
  const b = v(hw, 0, -hd);
  const c = v(hw, 0, hd);
  const e = v(-hw, 0, hd);
  const r1 = v(-hw, rise, 0);
  const r2 = v(hw, rise, 0);
  const tris = [
    // Slopes, eaves and gables.
    [a, r1, r2],
    [a, r2, b],
    [e, c, r2],
    [e, r2, r1],
    [a, e, r1],
    [b, r2, c],
    [a, b, c],
    [a, c, e],
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(tris.flat(2), 3));
  geometry.computeVertexNormals();
  return geometry;
}

type House = {
  x: number;
  z: number;
  w: number;
  d: number;
  eaves: number;
  rise: number;
  alongX: boolean;
};

function layoutHouses(): House[] {
  const random = mulberry32(20261105);
  const houses: House[] = [];
  const placed: Rect[] = [];

  // Rows of houses: [axis, fixed coordinate of the row's front, direction away from it, from, to].
  const rows: {
    alongX: boolean;
    front: number;
    away: 1 | -1;
    from: number;
    to: number;
  }[] = [
    // Across the south street, and across the east street.
    {
      alongX: true,
      front: STREET_OFFSET + ASPHALT_W / 2 + SIDEWALK_W + 3,
      away: 1,
      from: -46,
      to: 60,
    },
    {
      alongX: false,
      front: STREET_OFFSET + ASPHALT_W / 2 + SIDEWALK_W + 3,
      away: 1,
      from: -48,
      to: 24,
    },
    // Backing onto the project's garden, facing the street on its own side.
    {
      alongX: false,
      front: STREET_OFFSET - ASPHALT_W / 2 - SIDEWALK_W - 3,
      away: -1,
      from: -50,
      to: -26,
    },
    {
      alongX: true,
      front: STREET_OFFSET - ASPHALT_W / 2 - SIDEWALK_W - 3,
      away: -1,
      from: -52,
      to: -26,
    },
    // Behind the project (north and west).
    { alongX: true, front: LOT.minZ - 4, away: -1, from: -40, to: 22 },
    { alongX: false, front: LOT.minX - 4, away: -1, from: -18, to: 22 },
  ];

  for (const row of rows) {
    let cursor = row.from;
    while (cursor < row.to && houses.length < 34) {
      const w = 7 + random() * 3; // along the street
      const d = 8 + random() * 3; // depth
      const eaves = 5.2 + random() * 0.6; // two levels
      const rise = Math.min(MAX_HOUSE_HEIGHT - eaves, 1 + random() * 1.6);
      const along = cursor + w / 2;
      const across = row.front + row.away * (d / 2);
      const x = row.alongX ? along : across;
      const z = row.alongX ? across : along;
      const halfX = (row.alongX ? w : d) / 2;
      const halfZ = (row.alongX ? d : w) / 2;
      const rect = { minX: x - halfX, maxX: x + halfX, minZ: z - halfZ, maxZ: z + halfZ };
      cursor += w + 1.2 + random() * 2.2;

      if (distanceToSite(rect) < MIN_CLEARANCE) continue;
      if (rectsOverlap(rect, LOT)) continue;
      // Keep the studio render's viewpoint clear (homepage intro).
      if (blocksRenderView(rect)) continue;
      if (STREET_RECTS.some((s) => rectsOverlap(rect, s, 0.5))) continue;
      if (placed.some((p) => rectsOverlap(rect, p, 0.6))) continue;
      placed.push(rect);
      houses.push({ x, z, w, d, eaves, rise, alongX: row.alongX });
    }
  }
  return houses;
}

function buildHouseGeometries(houses: House[]) {
  const bodies: THREE.BufferGeometry[] = [];
  const roofs: THREE.BufferGeometry[] = [];
  for (const h of houses) {
    const body = new THREE.BoxGeometry(h.w, h.eaves, h.d).toNonIndexed();
    body.deleteAttribute("uv");
    const roof = gableRoof(h.w, h.d, h.rise, 0.35);
    const matrix = new THREE.Matrix4().makeRotationY(h.alongX ? 0 : Math.PI / 2);
    body.applyMatrix4(matrix).translate(h.x, GROUND_Y + h.eaves / 2, h.z);
    roof.applyMatrix4(matrix).translate(h.x, GROUND_Y + h.eaves, h.z);
    bodies.push(body);
    roofs.push(roof);
  }
  return { bodies: mergeGeometries(bodies), roofs: mergeGeometries(roofs) };
}

/** Ground with a hole where the excavation goes. */
function groundWithHole(rect: Rect, hole: { halfX: number; halfZ: number }) {
  // Shapes are drawn in XY then laid flat (rotate -90° about X maps y → -z).
  const shape = new THREE.Shape();
  shape.moveTo(rect.minX, -rect.maxZ);
  shape.lineTo(rect.maxX, -rect.maxZ);
  shape.lineTo(rect.maxX, -rect.minZ);
  shape.lineTo(rect.minX, -rect.minZ);
  shape.closePath();
  const path = new THREE.Path();
  path.moveTo(-hole.halfX, -hole.halfZ);
  path.lineTo(-hole.halfX, hole.halfZ);
  path.lineTo(hole.halfX, hole.halfZ);
  path.lineTo(hole.halfX, -hole.halfZ);
  path.closePath();
  shape.holes.push(path);
  return new THREE.ShapeGeometry(shape);
}

function Plane({ rect, y, color }: { rect: Rect; y: number; color: string }) {
  return (
    <mesh
      position={[(rect.minX + rect.maxX) / 2, y, (rect.minZ + rect.maxZ) / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[rect.maxX - rect.minX, rect.maxZ - rect.minZ]} />
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  );
}

function Hedges() {
  // Low hedges along the garden edges, with gaps for paths.
  const segments = useMemo(() => {
    const h = 0.9;
    const t = 0.7;
    const inset = 0.8;
    const list: { pos: [number, number, number]; size: [number, number, number] }[] = [];
    const run = (
      fixed: number,
      from: number,
      to: number,
      alongX: boolean,
      gaps: number[]
    ) => {
      const cuts = [from, ...gaps.flatMap((g) => [g - 1.6, g + 1.6]), to];
      for (let i = 0; i < cuts.length; i += 2) {
        const a = cuts[i];
        const b = cuts[i + 1];
        const mid = (a + b) / 2;
        const len = b - a;
        list.push(
          alongX
            ? { pos: [mid, GROUND_Y + h / 2, fixed], size: [len, h, t] }
            : { pos: [fixed, GROUND_Y + h / 2, mid], size: [t, h, len] }
        );
      }
    };
    run(LOT.maxZ - inset, LOT.minX + inset, LOT.maxX - inset, true, [0]);
    run(LOT.maxX - inset, LOT.minZ + inset, LOT.maxZ - inset - t, false, [4]);
    run(LOT.minZ + inset, LOT.minX + inset, LOT.maxX - inset, true, []);
    run(LOT.minX + inset, LOT.minZ + inset + t, LOT.maxZ - inset - t, false, []);
    return list;
  }, []);

  return (
    <group>
      {segments.map((s, i) => (
        <mesh key={i} position={s.pos} castShadow receiveShadow>
          <boxGeometry args={s.size} />
          <meshStandardMaterial color={COLORS.hedge} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function Crosswalks() {
  // Zebra stripes on each street, just before the crossing.
  const stripes = useMemo(() => {
    const list: { pos: [number, number, number]; size: [number, number] }[] = [];
    const stripeW = 0.5;
    const length = 3;
    const offset = ASPHALT_W / 2 + SIDEWALK_W + length / 2 + 0.5;
    for (let i = -3; i <= 3; i++) {
      const along = i * stripeW * 2;
      // On the X street, west of the crossing; on the Z street, north of it.
      list.push({
        pos: [STREET_OFFSET - offset, GROUND_Y + 0.012, STREET_OFFSET + along],
        size: [length, stripeW],
      });
      list.push({
        pos: [STREET_OFFSET + along, GROUND_Y + 0.012, STREET_OFFSET - offset],
        size: [stripeW, length],
      });
    }
    return list;
  }, []);

  return (
    <group>
      {stripes.map((s, i) => (
        <mesh key={i} position={s.pos} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={s.size} />
          <meshStandardMaterial color={COLORS.stripe} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

export function BimNeighborhood({ excavated }: { excavated: boolean }) {
  const { bodies, roofs, ground, garden } = useMemo(() => {
    const houseGeometries = buildHouseGeometries(layoutHouses());
    const world: Rect = { minX: -160, maxX: 160, minZ: -160, maxZ: 160 };
    return {
      ...houseGeometries,
      ground: groundWithHole(world, PIT),
      garden: groundWithHole(LOT, PIT),
    };
  }, []);

  const pitRect: Rect = {
    minX: -PIT.halfX,
    maxX: PIT.halfX,
    minZ: -PIT.halfZ,
    maxZ: PIT.halfZ,
  };

  return (
    <group>
      <mesh
        geometry={ground}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, GROUND_Y - 0.01, 0]}
        receiveShadow
      >
        <meshStandardMaterial color={COLORS.ground} roughness={1} />
      </mesh>
      <mesh
        geometry={garden}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, GROUND_Y, 0]}
        receiveShadow
      >
        <meshStandardMaterial color={COLORS.grass} roughness={1} />
      </mesh>

      {excavated ? (
        // Open box seen from the inside: the far walls and the floor of the excavation.
        <mesh position={[0, GROUND_Y / 2 - 0.01, 0]} receiveShadow>
          <boxGeometry args={[PIT.halfX * 2, GROUND_Y, PIT.halfZ * 2]} />
          <meshStandardMaterial color={COLORS.dirt} roughness={1} side={THREE.BackSide} />
        </mesh>
      ) : (
        <Plane rect={pitRect} y={GROUND_Y} color={COLORS.grass} />
      )}

      {/* Streets: asphalt over sidewalks (the sidewalks read as raised curbs). */}
      {STREET_RECTS.map((r, i) => (
        <group key={i}>
          <mesh
            position={[(r.minX + r.maxX) / 2, GROUND_Y + 0.06, (r.minZ + r.maxZ) / 2]}
            receiveShadow
          >
            <boxGeometry args={[r.maxX - r.minX, 0.12, r.maxZ - r.minZ]} />
            <meshStandardMaterial color={COLORS.sidewalk} roughness={0.95} />
          </mesh>
          <Plane
            rect={
              i === 0
                ? {
                    ...r,
                    minZ: STREET_OFFSET - ASPHALT_W / 2,
                    maxZ: STREET_OFFSET + ASPHALT_W / 2,
                  }
                : {
                    ...r,
                    minX: STREET_OFFSET - ASPHALT_W / 2,
                    maxX: STREET_OFFSET + ASPHALT_W / 2,
                  }
            }
            y={GROUND_Y + 0.121 + i * 0.001}
            color={COLORS.asphalt}
          />
        </group>
      ))}
      <group position={[0, 0.12, 0]}>
        <Crosswalks />
      </group>

      <Hedges />

      <mesh geometry={bodies} castShadow receiveShadow>
        <meshStandardMaterial color={COLORS.house} roughness={0.95} />
      </mesh>
      <mesh geometry={roofs} castShadow receiveShadow>
        <meshStandardMaterial color={COLORS.roof} roughness={0.9} />
      </mesh>
    </group>
  );
}
