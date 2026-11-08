"use client";

import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Edges, Instance, Instances } from "@react-three/drei";
import {
  type BuildingConfig,
  defaultBuildingConfig,
  seededRandom,
  totalBuildingHeight,
} from "@/lib/three/building-config";
import {
  generateApartmentLayout,
  type ApartmentLayout,
  type ExteriorSide,
} from "@/lib/three/building-layout";
import type { FloorPlan, FloorPlanRoom } from "@/lib/units/floor-plan";

/**
 * The "Edificio Demo" tower drawn as architecture: floor-to-ceiling glazing between white
 * slab bands, glass balconies on the north and south, vertical fins on the east and west,
 * a glazed lobby with a canopy and a rooftop terrace with a pool.
 *
 * Units keep the procedural layout (same ids as the database: "P04-B"). Each one gets an
 * invisible hit box and a tinted "status" shell drawn over its glazing.
 */

export const EDIFICIO_PALETTE = {
  stone: "#ece7de",
  stoneShade: "#ddd6ca",
  slab: "#f4f1ea",
  frame: "#2a2c30",
  deck: "#a5805c",
  water: "#3aa6c2",
  railing: "#b4d0db",
};

const SLAB = 0.34;
const SLAB_OVERHANG = 0.28;
const MODULE = 1.5;
const GHOST_COLOR = "#ffffff";

type FaceSlot = {
  position: [number, number, number];
  rotationY: number;
  width: number;
  floor: number;
};

type GlassSlot = FaceSlot & { tint: string };

const SIDE_ROTATION: Record<ExteriorSide, number> = {
  north: 0,
  south: Math.PI,
  east: Math.PI / 2,
  west: -Math.PI / 2,
};

const GLASS_TINTS = ["#25323a", "#2c3a43", "#334550", "#3b4d58", "#22303a"];
const CURTAIN_TINTS = ["#6b5a49", "#7d7466", "#55606a"];

function glassTint(seed: number) {
  const r = seededRandom(seed);
  if (r > 0.88) return CURTAIN_TINTS[Math.floor(seededRandom(seed + 1) * CURTAIN_TINTS.length)];
  return GLASS_TINTS[Math.floor(r * GLASS_TINTS.length) % GLASS_TINTS.length];
}

/** Point on an apartment's exterior face, `along` meters from its center, `out` meters outside. */
function facePoint(
  apt: ApartmentLayout,
  side: ExteriorSide,
  along: number,
  out: number,
  y: number,
): [number, number, number] {
  const [x, , z] = apt.position;
  const [w, , d] = apt.size;
  switch (side) {
    case "north":
      return [x + along, y, z + d / 2 + out];
    case "south":
      return [x - along, y, z - d / 2 - out];
    case "east":
      return [x + w / 2 + out, y, z - along];
    case "west":
      return [x - w / 2 - out, y, z + along];
  }
}

function faceLength(apt: ApartmentLayout, side: ExteriorSide) {
  return side === "north" || side === "south" ? apt.size[0] : apt.size[2];
}

type FacadeParts = {
  glass: GlassSlot[];
  mullions: FaceSlot[];
  fins: FaceSlot[];
  balconies: FaceSlot[];
};

function buildFacade(layouts: ApartmentLayout[], config: BuildingConfig): FacadeParts {
  const glass: GlassSlot[] = [];
  const mullions: FaceSlot[] = [];
  const fins: FaceSlot[] = [];
  const balconies: FaceSlot[] = [];
  const clear = config.floorHeight - SLAB;

  for (const apt of layouts) {
    const y0 = apt.position[1] - config.floorHeight / 2;
    const yMid = y0 + clear / 2;
    for (const side of apt.exteriorSides) {
      const len = faceLength(apt, side);
      const count = Math.max(2, Math.round(len / MODULE));
      const step = len / count;
      const rot = SIDE_ROTATION[side];
      for (let i = 0; i < count; i++) {
        const along = -len / 2 + step * (i + 0.5);
        const seed = apt.floor * 131 + apt.letter.charCodeAt(0) * 17 + side.length * 7 + i;
        glass.push({
          position: facePoint(apt, side, along, 0.04, yMid),
          rotationY: rot,
          width: step - 0.06,
          floor: apt.floor,
          tint: glassTint(seed),
        });
      }
      for (let i = 0; i <= count; i++) {
        const along = -len / 2 + step * i;
        mullions.push({
          position: facePoint(apt, side, along, 0.06, yMid),
          rotationY: rot,
          width: 0.07,
          floor: apt.floor,
        });
      }
      if (side === "east" || side === "west") {
        // Vertical fins every other module: the east and west faces get the low sun.
        for (let i = 2; i < count; i += 2) {
          const along = -len / 2 + step * i;
          fins.push({
            position: facePoint(apt, side, along, 0.26, yMid),
            rotationY: rot,
            width: 0.12,
            floor: apt.floor,
          });
        }
      }
      if (side === apt.balconySide) {
        balconies.push({
          position: facePoint(apt, side, 0, config.balconyDepth / 2 + SLAB_OVERHANG * 0.2, y0),
          rotationY: rot,
          width: len - 0.6,
          floor: apt.floor,
        });
      }
    }
  }
  return { glass, mullions, fins, balconies };
}

const projected = new THREE.Vector3();

const PIN_MARGIN = 8;
/** Gap between the unit and the card's bottom edge (matches the card's CSS offset). */
const PIN_GAP = 12;

/** A DOM card over the canvas that should sit on top of a unit. */
export type UnitPinTarget = { id: string | null; ref: RefObject<HTMLDivElement | null> };

/**
 * Moves each pin's card next to its unit every frame without covering it: above the unit's
 * on-screen outline when there is room, otherwise beside it, always inside the view. Hidden
 * when there is no unit or it is behind the camera. Plain DOM instead of drei's Html, whose
 * extra React root does not survive dev double-mounting here.
 *
 * The card's CSS anchors it by its bottom centre (translate -50%, -100% - PIN_GAP).
 */
function ScreenPins({
  pins,
  cornersFor,
}: {
  pins: UnitPinTarget[];
  cornersFor: (id: string | null) => THREE.Vector3[] | null;
}) {
  useFrame(({ camera, size }) => {
    for (const pin of pins) {
      const el = pin.ref.current;
      if (!el) continue;
      const corners = cornersFor(pin.id);
      if (!corners) {
        placePin(el, null);
        continue;
      }
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      let behind = false;
      for (const corner of corners) {
        projected.copy(corner).project(camera);
        if (projected.z > 1) behind = true;
        const sx = ((projected.x + 1) / 2) * size.width;
        const sy = ((1 - projected.y) / 2) * size.height;
        minX = Math.min(minX, sx);
        maxX = Math.max(maxX, sx);
        minY = Math.min(minY, sy);
        maxY = Math.max(maxY, sy);
      }
      if (behind) {
        placePin(el, null);
        continue;
      }
      const card = el.firstElementChild as HTMLElement | null;
      const w = card?.offsetWidth ?? 0;
      const h = card?.offsetHeight ?? 0;
      const fitsAbove = minY - PIN_GAP - h >= PIN_MARGIN;
      const fitsRight = maxX + PIN_GAP + w <= size.width - PIN_MARGIN;
      let x: number;
      let y: number;
      if (fitsAbove) {
        x = (minX + maxX) / 2;
        y = minY;
      } else {
        // Beside the unit, vertically centred on it.
        x = fitsRight ? maxX + PIN_GAP + w / 2 : minX - PIN_GAP - w / 2;
        y = (minY + maxY) / 2 + h / 2 + PIN_GAP;
      }
      x = Math.min(Math.max(x, w / 2 + PIN_MARGIN), size.width - w / 2 - PIN_MARGIN);
      y = Math.min(Math.max(y, h + PIN_GAP + PIN_MARGIN), size.height - PIN_MARGIN);
      placePin(el, [x, y]);
    }
  });
  return null;
}

/** Moves a pin element to a screen position, or hides it. */
function placePin(el: HTMLElement, at: [number, number] | null) {
  if (!at) {
    el.style.visibility = "hidden";
    return;
  }
  el.style.transform = `translate3d(${at[0]}px, ${at[1]}px, 0)`;
  el.style.visibility = "visible";
}

function visibleUpTo<T extends { floor: number }>(items: T[], focusFloor: number | null) {
  return focusFloor == null ? items : items.filter((item) => item.floor <= focusFloor);
}

export type EdificioModelProps = {
  config?: BuildingConfig;
  castShadow?: boolean;
  /** Apartment id -> status color. */
  apartmentColors: Record<string, string>;
  /** Apartment ids excluded by the active filters. */
  dimmedIds: Set<string>;
  /** Tint every unit with its status color ("Disponibilidad" view). */
  showStatus: boolean;
  /** Floors above this one turn into a light wireframe ghost. */
  focusFloor: number | null;
  hoveredId: string | null;
  selectedId: string | null;
  /** Plan of the selected unit: when set, that unit is drawn open with these rooms. */
  openPlan?: FloorPlan | null;
  /** DOM cards over the canvas, each moved every frame to sit on top of its unit. */
  pins?: UnitPinTarget[];
  onApartmentClick: (id: string, event: ThreeEvent<MouseEvent>) => void;
  onApartmentPointerOver: (id: string, event: ThreeEvent<PointerEvent>) => void;
  onApartmentPointerOut: (id: string, event: ThreeEvent<PointerEvent>) => void;
};

export function EdificioModel({
  config = defaultBuildingConfig,
  castShadow = true,
  apartmentColors,
  dimmedIds,
  showStatus,
  focusFloor,
  hoveredId,
  selectedId,
  openPlan,
  pins,
  onApartmentClick,
  onApartmentPointerOver,
  onApartmentPointerOut,
}: EdificioModelProps) {
  const layouts = useMemo(() => generateApartmentLayout(config), [config]);
  const facade = useMemo(() => buildFacade(layouts, config), [layouts, config]);

  const glass = useMemo(() => visibleUpTo(facade.glass, focusFloor), [facade, focusFloor]);
  const mullions = useMemo(() => visibleUpTo(facade.mullions, focusFloor), [facade, focusFloor]);
  const fins = useMemo(() => visibleUpTo(facade.fins, focusFloor), [facade, focusFloor]);
  const balconies = useMemo(() => visibleUpTo(facade.balconies, focusFloor), [facade, focusFloor]);

  const { floors, floorHeight, groundFloorHeight: G, buildingWidth: W, buildingDepth: D } = config;
  const clear = floorHeight - SLAB;
  const lastSolidFloor = focusFloor ?? floors;
  const roofY = G + floors * floorHeight;
  const roofVisible = focusFloor == null || focusFloor >= floors;
  const height = totalBuildingHeight(config);
  // Corners of each unit's box: its card is placed around their on-screen outline.
  const unitCorners = useMemo(
    () =>
      new Map(
        layouts.map((apt) => {
          const bottom = apt.position[1] - floorHeight / 2;
          const corners: THREE.Vector3[] = [];
          for (const dx of [-0.5, 0.5])
            for (const dz of [-0.5, 0.5])
              for (const yy of [bottom, bottom + clear])
                corners.push(
                  new THREE.Vector3(
                    apt.position[0] + dx * apt.size[0],
                    yy,
                    apt.position[2] + dz * apt.size[2],
                  ),
                );
          return [apt.id, { floor: apt.floor, corners }];
        }),
      ),
    [layouts, floorHeight, clear],
  );
  const cornersFor = (id: string | null) => {
    const unit = id ? unitCorners.get(id) : undefined;
    return unit && unit.floor <= lastSolidFloor ? unit.corners : null;
  };

  return (
    <group>
      {pins?.length ? <ScreenPins pins={pins} cornersFor={cornersFor} /> : null}

      <Lobby config={config} castShadow={castShadow} />

      {/* Floor slabs: white bands that read the floors from afar. */}
      {/* With a floor isolated, its ceiling goes too: the units read from above. */}
      {Array.from({ length: focusFloor != null && focusFloor < floors ? focusFloor : floors + 1 }, (_, i) => (
        <mesh
          key={`slab-${i}`}
          position={[0, G + i * floorHeight - SLAB / 2, 0]}
          castShadow={castShadow}
          receiveShadow
        >
          <boxGeometry args={[W + SLAB_OVERHANG * 2, SLAB, D + SLAB_OVERHANG * 2]} />
          <meshStandardMaterial color={EDIFICIO_PALETTE.slab} roughness={0.85} />
        </mesh>
      ))}

      {/* Core piers: the stair and lift core shows between the units on every face. */}
      <CorePiers config={config} topFloor={lastSolidFloor} castShadow={castShadow} />

      {/* Units: body behind the glass (and the click target), then the status shell. */}
      {layouts.map((apt) => {
        if (apt.floor > lastSolidFloor) return null;
        const y = apt.position[1] - floorHeight / 2 + clear / 2;
        const plan = selectedId === apt.id ? openPlan : null;
        const open = plan != null;
        return (
          <group key={apt.id}>
            {plan ? <OpenUnitPlan apt={apt} plan={plan} floorY={apt.position[1] - floorHeight / 2} /> : null}
            <mesh
              position={[apt.position[0], y, apt.position[2]]}
              castShadow={castShadow}
              receiveShadow
              onClick={(e) => {
                e.stopPropagation();
                onApartmentClick(apt.id, e);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                onApartmentPointerOver(apt.id, e);
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                onApartmentPointerOut(apt.id, e);
              }}
            >
              <boxGeometry args={[apt.size[0], clear, apt.size[2]]} />
              {/* Opened unit: the box stays as the click target but is not drawn. */}
              <meshStandardMaterial
                color={EDIFICIO_PALETTE.stoneShade}
                roughness={0.9}
                visible={!open}
              />
            </mesh>
            <StatusShell
              position={[apt.position[0], y, apt.position[2]]}
              size={[apt.size[0] + 0.22, clear + 0.04, apt.size[2] + 0.22]}
              color={
                selectedId === apt.id
                  ? HIGHLIGHT_COLOR
                  : (apartmentColors[apt.id] ?? "#ffffff")
              }
              mode={
                open
                  ? "hidden"
                  : hoveredId === apt.id
                    ? "hovered"
                    : showStatus
                      ? dimmedIds.has(apt.id)
                        ? "dimmed"
                        : "status"
                      : "hidden"
              }
            />
          </group>
        );
      })}

      {/* Glazing: dark, smooth glass; each pane a slightly different shade (rooms, curtains). */}
      <Instances limit={Math.max(1, glass.length)} range={glass.length}>
        <planeGeometry args={[1, clear - 0.08]} />
        <meshPhysicalMaterial
          color="#ffffff"
          roughness={0.05}
          metalness={0}
          ior={1.5}
          specularIntensity={1}
          envMapIntensity={1.7}
        />
        {glass.map((g, i) => (
          <Instance
            key={i}
            position={g.position}
            rotation={[0, g.rotationY, 0]}
            scale={[g.width, 1, 1]}
            color={g.tint}
          />
        ))}
      </Instances>

      {/* Window frames */}
      <Instances limit={Math.max(1, mullions.length)} range={mullions.length}>
        <boxGeometry args={[1, clear, 0.08]} />
        <meshStandardMaterial color={EDIFICIO_PALETTE.frame} roughness={0.45} metalness={0.5} />
        {mullions.map((m, i) => (
          <Instance key={i} position={m.position} rotation={[0, m.rotationY, 0]} scale={[m.width, 1, 1]} />
        ))}
      </Instances>

      {/* Vertical fins on the east and west faces */}
      <Instances limit={Math.max(1, fins.length)} range={fins.length} castShadow={castShadow}>
        <boxGeometry args={[1, clear, 0.5]} />
        <meshStandardMaterial color={EDIFICIO_PALETTE.stone} roughness={0.8} />
        {fins.map((f, i) => (
          <Instance key={i} position={f.position} rotation={[0, f.rotationY, 0]} scale={[f.width, 1, 1]} />
        ))}
      </Instances>

      <Balconies slots={balconies} depth={config.balconyDepth} castShadow={castShadow} />

      {roofVisible ? (
        <Rooftop config={config} roofY={roofY} castShadow={castShadow} />
      ) : null}

      {/* Floors above the focused one: a light ghost of the volume, outlined. */}
      {focusFloor != null && focusFloor < floors ? (
        <mesh
          position={[0, (G + focusFloor * floorHeight + height) / 2, 0]}
          raycast={() => null}
        >
          <boxGeometry args={[W, height - (G + focusFloor * floorHeight), D]} />
          <meshBasicMaterial color={GHOST_COLOR} transparent opacity={0.12} depthWrite={false} />
          <Edges color="#8d969c" threshold={15} />
        </mesh>
      ) : null}
    </group>
  );
}

const PLAN_WALL_HEIGHT = 1.1;
const PLAN_WALL = 0.12;
const PLAN_DOOR = 0.9;
/** Width of the opening between the living room and the kitchen. */
const PLAN_KITCHEN_OPENING = 2.6;
const PLAN_COLORS = {
  wood: "#c9a37c",
  tile: "#dfe2e1",
  wall: "#fbf9f5",
  wallEdge: "#9a9488",
  furniture: "#8f8a82",
  light: "#e9e4da",
};

/** An axis-aligned box of the plan, in unit meters (see `OpenUnitPlan`). */
type PlanBox = { u: [number, number]; v: [number, number]; h: number; color: string };
type PlanRect = { u: [number, number]; v: [number, number] };

/**
 * The selected unit drawn open, seen from above: floors, low cut walls and a few pieces of
 * furniture. Rooms follow the unit's 2D plan (same rooms, same arrangement as the panel),
 * stretched to the unit's footprint in the tower.
 *
 * Unit meters: u runs from the core (0) to the side facade (W), v from the core (0) to the
 * balcony facade (D), so the same plan mirrors itself into each corner of the floor.
 */
function OpenUnitPlan({
  apt,
  plan,
  floorY,
}: {
  apt: ApartmentLayout;
  plan: FloorPlan;
  floorY: number;
}) {
  const [W, , D] = apt.size;
  const col = apt.position[0] < 0 ? -1 : 1;
  const row = apt.position[2] < 0 ? -1 : 1;

  const boxes = useMemo(() => {
    const t = PLAN_WALL;
    const h = PLAN_WALL_HEIGHT;
    const su = W / plan.totalWidth;
    const sv = D / plan.totalDepth;
    // Plan x = 0 (living column) goes to the side facade; plan y grows toward the balcony.
    const rect = (r: FloorPlanRoom): PlanRect => ({
      u: [W - (r.x + r.width) * su, W - r.x * su],
      v: [r.y * sv, (r.y + r.depth) * sv],
    });
    const rooms = plan.rooms.map((r) => ({ label: r.label, ...rect(r) }));
    const living = rooms.find((r) => r.label.startsWith("Estar"));
    const kitchen = rooms.find((r) => r.label === "Cocina");
    const bath = rooms.find((r) => r.label === "Baño");
    const bedrooms = rooms.filter((r) => r.label.startsWith("Dormitorio"));
    if (!living || !kitchen || !bath) return [];

    const box = (u: [number, number], v: [number, number], height: number, color: string) => ({
      u,
      v,
      h: height,
      color,
    });
    const wall = (u: [number, number], v: [number, number]) => box(u, v, h, PLAN_COLORS.wall);
    const mid = (a: [number, number]) => (a[0] + a[1]) / 2;
    // Wall along v = `at` (or u = `at`), from a0 to a1, with openings of `gap` centred on `doors`.
    const cutWall = (axis: "u" | "v", at: number, a0: number, a1: number, doors: number[], gap = PLAN_DOOR) => {
      const pieces: PlanBox[] = [];
      let start = a0;
      for (const d of [...doors].sort((a, b) => a - b)) {
        if (d - gap / 2 > start) pieces.push(span(axis, at, start, d - gap / 2));
        start = d + gap / 2;
      }
      if (a1 > start) pieces.push(span(axis, at, start, a1));
      return pieces;
    };
    const span = (axis: "u" | "v", at: number, a0: number, a1: number) =>
      axis === "v" ? wall([a0, a1], [at - t / 2, at + t / 2]) : wall([at - t / 2, at + t / 2], [a0, a1]);

    // The line between the living column and the bedroom column.
    const split = living.u[0];
    const floors: PlanBox[] = rooms.map((r) =>
      box(r.u, r.v, 0, r.label === "Baño" ? PLAN_COLORS.tile : PLAN_COLORS.wood),
    );
    const walls: PlanBox[] = [
      // Outer walls
      wall([0, W], [0, t]),
      wall([0, W], [D - t, D]),
      wall([0, t], [0, D]),
      wall([W - t, W], [0, D]),
      // Bedroom column: a door from the living side into each room
      ...cutWall("u", split, 0, D, [...bedrooms, bath].map((r) => mid(r.v))),
      ...[...bedrooms.slice(1), bath].map((r) => span("v", r.v[0], 0, split)),
      // Open kitchen
      ...cutWall("v", kitchen.v[0], split, W, [mid(kitchen.u)], PLAN_KITCHEN_OPENING),
    ];

    const furniture: PlanBox[] = [];
    bedrooms.forEach((r, i) => {
      // Bed against the outer (core-side) wall, head on the wall at u = t.
      const width = i === 0 ? 1.6 : 0.9;
      const length = Math.min(2, split - t - 0.6);
      const v0 = mid(r.v) - width / 2;
      furniture.push(box([t, t + length], [v0, v0 + width], 0.45, PLAN_COLORS.light));
    });
    // Kitchen counter along the balcony facade, island in front of it.
    furniture.push(box([kitchen.u[0] + 0.6, kitchen.u[1] - 0.6], [D - t - 0.6, D - t], 0.9, PLAN_COLORS.furniture));
    // Living: sofa facing the side facade, dining table toward the kitchen.
    const sofaU = W - t - Math.min(2.6, (W - split) * 0.4);
    furniture.push(box([sofaU, sofaU + 0.9], [mid(living.v) - 1.2, mid(living.v) + 1.2], 0.42, PLAN_COLORS.furniture));
    const tableV = living.v[1] - 1.6;
    furniture.push(box([split + 1.2, split + 2.8], [tableV, tableV + 0.9], 0.75, PLAN_COLORS.light));

    return [...floors, ...walls, ...furniture];
  }, [W, D, plan]);

  return (
    <group>
      {boxes.map((b, i) => {
        const cu = (b.u[0] + b.u[1]) / 2;
        const cv = (b.v[0] + b.v[1]) / 2;
        const position: [number, number, number] = [
          apt.position[0] + col * (cu - W / 2),
          floorY + 0.02 + b.h / 2,
          apt.position[2] + row * (cv - D / 2),
        ];
        const width = b.u[1] - b.u[0];
        const depth = b.v[1] - b.v[0];
        if (b.h === 0)
          return (
            <mesh key={i} position={position} rotation={[-Math.PI / 2, 0, 0]} receiveShadow raycast={() => null}>
              <planeGeometry args={[width, depth]} />
              <meshStandardMaterial color={b.color} roughness={0.8} />
            </mesh>
          );
        return (
          <mesh key={i} position={position} castShadow receiveShadow raycast={() => null}>
            <boxGeometry args={[width, b.h, depth]} />
            <meshStandardMaterial color={b.color} roughness={0.85} />
            {b.color === PLAN_COLORS.wall ? <Edges color={PLAN_COLORS.wallEdge} threshold={15} /> : null}
          </mesh>
        );
      })}
    </group>
  );
}

type ShellMode = "hidden" | "status" | "dimmed" | "hovered" | "selected";

const SHELL_OPACITY: Record<ShellMode, number> = {
  hidden: 0,
  status: 0.36,
  dimmed: 0.06,
  hovered: 0.35,
  selected: 0.62,
};

/** Selected unit: a smoked graphite that reads on the white tower. Hovered units show their status color. */
const HIGHLIGHT_COLOR = "#2c2c30";

/**
 * Tinted volume over a unit's glazing; fades between states. While it fades out it keeps
 * the color it had, so leaving a unit never flashes another color.
 */
function StatusShell({
  position,
  size,
  color,
  mode,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  mode: ShellMode;
}) {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const appliedColor = useRef<string | null>(null);

  useFrame(({ clock }, delta) => {
    const material = materialRef.current;
    const mesh = meshRef.current;
    if (!material || !mesh) return;
    if (mode !== "hidden" && appliedColor.current !== color) {
      material.color.set(color);
      material.emissive.set(color);
      appliedColor.current = color;
    }
    let target = SHELL_OPACITY[mode];
    if (mode === "selected") target += Math.sin(clock.elapsedTime * 2.5) * 0.06;
    material.opacity = THREE.MathUtils.damp(material.opacity, target, 10, delta);
    mesh.visible = material.opacity > 0.01;
    const glow = mode === "hovered" || mode === "selected" ? 0.45 : 0.12;
    material.emissiveIntensity = THREE.MathUtils.damp(material.emissiveIntensity, glow, 10, delta);
  });

  return (
    <mesh ref={meshRef} position={position} raycast={() => null} renderOrder={2}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        ref={materialRef}
        emissiveIntensity={0.12}
        roughness={0.4}
        transparent
        opacity={0}
        depthWrite={false}
      />
      {mode === "selected" ? <Edges color="#ffffff" lineWidth={2} /> : null}
    </mesh>
  );
}

function Balconies({
  slots,
  depth,
  castShadow,
}: {
  slots: FaceSlot[];
  depth: number;
  castShadow: boolean;
}) {
  const count = Math.max(1, slots.length);
  return (
    <group>
      {/* Slab, flush with the floor */}
      <Instances limit={count} range={slots.length} castShadow={castShadow} receiveShadow>
        <boxGeometry args={[1, 0.22, depth]} />
        <meshStandardMaterial color={EDIFICIO_PALETTE.slab} roughness={0.85} />
        {slots.map((b, i) => (
          <Instance
            key={i}
            position={[b.position[0], b.position[1] - 0.11, b.position[2]]}
            rotation={[0, b.rotationY, 0]}
            scale={[b.width, 1, 1]}
          />
        ))}
      </Instances>
      {/* Wood deck */}
      <Instances limit={count} range={slots.length} receiveShadow>
        <boxGeometry args={[1, 0.03, depth - 0.1]} />
        <meshStandardMaterial color={EDIFICIO_PALETTE.deck} roughness={0.75} />
        {slots.map((b, i) => (
          <Instance
            key={i}
            position={[b.position[0], b.position[1] + 0.015, b.position[2]]}
            rotation={[0, b.rotationY, 0]}
            scale={[b.width - 0.1, 1, 1]}
          />
        ))}
      </Instances>
      {/* Glass railing (front) */}
      <Instances limit={count} range={slots.length}>
        <boxGeometry args={[1, 1.05, 0.03]} />
        <meshStandardMaterial
          color={EDIFICIO_PALETTE.railing}
          roughness={0.1}
          metalness={0.2}
          transparent
          opacity={0.5}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
        {slots.map((b, i) => {
          const [nx, nz] = [Math.sin(b.rotationY), Math.cos(b.rotationY)];
          return (
            <Instance
              key={i}
              position={[
                b.position[0] + nx * (depth / 2 - 0.03),
                b.position[1] + 0.55,
                b.position[2] + nz * (depth / 2 - 0.03),
              ]}
              rotation={[0, b.rotationY, 0]}
              scale={[b.width, 1, 1]}
            />
          );
        })}
      </Instances>
      {/* Handrail */}
      <Instances limit={count} range={slots.length}>
        <boxGeometry args={[1, 0.05, 0.07]} />
        <meshStandardMaterial color={EDIFICIO_PALETTE.frame} roughness={0.4} metalness={0.6} />
        {slots.map((b, i) => {
          const [nx, nz] = [Math.sin(b.rotationY), Math.cos(b.rotationY)];
          return (
            <Instance
              key={i}
              position={[
                b.position[0] + nx * (depth / 2 - 0.03),
                b.position[1] + 1.1,
                b.position[2] + nz * (depth / 2 - 0.03),
              ]}
              rotation={[0, b.rotationY, 0]}
              scale={[b.width, 1, 1]}
            />
          );
        })}
      </Instances>
    </group>
  );
}

function CorePiers({
  config,
  topFloor,
  castShadow,
}: {
  config: BuildingConfig;
  topFloor: number;
  castShadow: boolean;
}) {
  const { groundFloorHeight: G, floorHeight, buildingWidth: W, buildingDepth: D, corridorGap } =
    config;
  const top = G + topFloor * floorHeight;
  const h = top - G;
  const y = G + h / 2;
  const pierW = corridorGap + 0.5;
  const out = 0.32;
  if (h <= 0) return null;
  const piers: { pos: [number, number, number]; size: [number, number, number] }[] = [
    { pos: [0, y, D / 2 + out / 2 - 0.1], size: [pierW, h, out + 0.2] },
    { pos: [0, y, -D / 2 - out / 2 + 0.1], size: [pierW, h, out + 0.2] },
    { pos: [W / 2 + out / 2 - 0.1, y, 0], size: [out + 0.2, h, pierW] },
    { pos: [-W / 2 - out / 2 + 0.1, y, 0], size: [out + 0.2, h, pierW] },
  ];
  // Corner columns
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      piers.push({ pos: [sx * (W / 2 + 0.05), y, sz * (D / 2 + 0.05)], size: [0.55, h, 0.55] });
    }
  }
  return (
    <group>
      {piers.map((p, i) => (
        <mesh key={i} position={p.pos} castShadow={castShadow} receiveShadow>
          <boxGeometry args={p.size} />
          <meshStandardMaterial color={EDIFICIO_PALETTE.stone} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function Lobby({ config, castShadow }: { config: BuildingConfig; castShadow: boolean }) {
  const { groundFloorHeight: G, buildingWidth: W, buildingDepth: D } = config;
  const h = G - SLAB;
  const columns = useMemo(() => {
    const list: [number, number, number][] = [];
    const nx = 6;
    const nz = 4;
    for (let i = 0; i <= nx; i++) {
      const x = -W / 2 + 0.35 + ((W - 0.7) * i) / nx;
      list.push([x, h / 2, D / 2 - 0.35], [x, h / 2, -D / 2 + 0.35]);
    }
    for (let i = 1; i < nz; i++) {
      const z = -D / 2 + 0.35 + ((D - 0.7) * i) / nz;
      list.push([W / 2 - 0.35, h / 2, z], [-W / 2 + 0.35, h / 2, z]);
    }
    return list;
  }, [W, D, h]);

  return (
    <group>
      {/* Recessed glazed lobby, warm inside */}
      <mesh position={[0, h / 2, 0]} receiveShadow>
        <boxGeometry args={[W - 2.2, h, D - 2.2]} />
        <meshPhysicalMaterial
          color="#3a3d3c"
          roughness={0.06}
          envMapIntensity={1.5}
          emissive="#f2c27a"
          emissiveIntensity={0.08}
        />
      </mesh>
      <Instances limit={columns.length} range={columns.length} castShadow={castShadow}>
        <boxGeometry args={[0.5, h, 0.5]} />
        <meshStandardMaterial color={EDIFICIO_PALETTE.stone} roughness={0.85} />
        {columns.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>
      {/* Entrance canopy, facing the avenue (north) */}
      <mesh position={[0, h - 0.6, D / 2 + 1.6]} castShadow={castShadow} receiveShadow>
        <boxGeometry args={[8, 0.22, 3.4]} />
        <meshStandardMaterial color={EDIFICIO_PALETTE.frame} roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, h - 0.74, D / 2 + 1.6]}>
        <boxGeometry args={[7.6, 0.04, 3.1]} />
        <meshStandardMaterial
          color="#fff1d6"
          emissive="#ffd9a0"
          emissiveIntensity={0.5}
          roughness={0.6}
        />
      </mesh>
      {/* Entrance steps */}
      <mesh position={[0, 0.08, D / 2 + 1.6]} receiveShadow>
        <boxGeometry args={[6, 0.16, 3]} />
        <meshStandardMaterial color="#cfc9bd" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Rooftop({
  config,
  roofY,
  castShadow,
}: {
  config: BuildingConfig;
  roofY: number;
  castShadow: boolean;
}) {
  const { buildingWidth: W, buildingDepth: D } = config;
  const railH = 1.1;
  const railing: { pos: [number, number, number]; size: [number, number, number] }[] = [
    { pos: [0, roofY + railH / 2, D / 2 + 0.2], size: [W + 0.4, railH, 0.04] },
    { pos: [0, roofY + railH / 2, -D / 2 - 0.2], size: [W + 0.4, railH, 0.04] },
    { pos: [W / 2 + 0.2, roofY + railH / 2, 0], size: [0.04, railH, D + 0.4] },
    { pos: [-W / 2 - 0.2, roofY + railH / 2, 0], size: [0.04, railH, D + 0.4] },
  ];
  const loungers = [-8.5, -7, -5.5, -4].map((x) => [x, roofY + 0.2, 7.3] as [number, number, number]);
  const slats = Array.from({ length: 9 }, (_, i) => -8.8 + i * 0.85);

  return (
    <group>
      {/* Wood deck on the west half */}
      <mesh position={[-5.6, roofY + 0.04, 0]} receiveShadow>
        <boxGeometry args={[11.6, 0.08, D - 0.6]} />
        <meshStandardMaterial color={EDIFICIO_PALETTE.deck} roughness={0.75} />
      </mesh>
      {/* Light roofing on the east half */}
      <mesh position={[6, roofY + 0.02, 0]} receiveShadow>
        <boxGeometry args={[W / 2 - 0.4, 0.04, D - 0.6]} />
        <meshStandardMaterial color="#d6d8d6" roughness={0.95} />
      </mesh>

      {/* Pool */}
      <mesh position={[-5.6, roofY + 0.32, 3.4]} castShadow={castShadow} receiveShadow>
        <boxGeometry args={[9.6, 0.56, 4.4]} />
        <meshStandardMaterial color={EDIFICIO_PALETTE.slab} roughness={0.8} />
      </mesh>
      <mesh position={[-5.6, roofY + 0.61, 3.4]}>
        <boxGeometry args={[9, 0.02, 3.8]} />
        <meshPhysicalMaterial
          color={EDIFICIO_PALETTE.water}
          roughness={0.04}
          emissive="#0e5a70"
          emissiveIntensity={0.35}
          envMapIntensity={1.6}
        />
      </mesh>
      {loungers.map((p, i) => (
        <mesh key={i} position={p} castShadow={castShadow}>
          <boxGeometry args={[0.7, 0.28, 1.8]} />
          <meshStandardMaterial color="#f7f5f0" roughness={0.7} />
        </mesh>
      ))}

      {/* Pergola */}
      {[
        [-9.4, -6.6],
        [-9.4, -1.8],
        [-1.8, -6.6],
        [-1.8, -1.8],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, roofY + 1.3, z]} castShadow={castShadow}>
          <boxGeometry args={[0.16, 2.6, 0.16]} />
          <meshStandardMaterial color={EDIFICIO_PALETTE.frame} roughness={0.5} metalness={0.4} />
        </mesh>
      ))}
      {slats.map((x, i) => (
        <mesh key={i} position={[x, roofY + 2.62, -4.2]} castShadow={castShadow}>
          <boxGeometry args={[0.12, 0.18, 5.2]} />
          <meshStandardMaterial color="#8a6a4c" roughness={0.7} />
        </mesh>
      ))}

      {/* Machine room / lift overrun */}
      <mesh position={[6.4, roofY + 1.6, -1]} castShadow={castShadow} receiveShadow>
        <boxGeometry args={[6.2, 3.2, 7]} />
        <meshStandardMaterial color={EDIFICIO_PALETTE.stone} roughness={0.85} />
      </mesh>
      <mesh position={[6.4, roofY + 3.25, -1]}>
        <boxGeometry args={[6.5, 0.12, 7.3]} />
        <meshStandardMaterial color={EDIFICIO_PALETTE.slab} roughness={0.85} />
      </mesh>

      {/* Glass guard rail around the terrace */}
      {railing.map((r, i) => (
        <mesh key={i} position={r.pos}>
          <boxGeometry args={r.size} />
          <meshStandardMaterial
            color={EDIFICIO_PALETTE.railing}
            roughness={0.1}
            metalness={0.2}
            transparent
            opacity={0.45}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}
