"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import { type BuildingConfig, totalBuildingHeight } from "@/lib/three/building-config";
import { generateApartmentLayout, type ApartmentLayout } from "@/lib/three/building-layout";
import { CATALUNA_CONFIG } from "@/lib/three/cataluna-ii";
import type { FloorPlan, FloorPlanRoom } from "@/lib/units/floor-plan";
import { addRenderTexture } from "@/components/three/visual/surface-detail";
import { CATALUNA_PALETTE, CatalunaArchitecture } from "./CatalunaArchitecture";

/**
 * Cataluña II (Buenos Aires 2771, Mar del Plata) as in its brochure: the street facade with
 * its staggered grey frames, black railings and aluminium windows, the raised entrance between
 * two slatted gates, and the roof terrace with its black pergola (see `CatalunaArchitecture`).
 *
 * Units follow the brochure's numbering (101 … 602, same ids as the unit data). Each one is
 * a solid volume behind the facade (the click target), with a tinted "status" shell over it.
 */

const GHOST_COLOR = "#ffffff";

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


export type EdificioModelProps = {
  config?: BuildingConfig;
  castShadow?: boolean;
  /** Apartment id -> status color. */
  apartmentColors: Record<string, string>;
  /** Apartment ids excluded by the active filters. */
  dimmedIds: Set<string>;
  /** Tint every unit with its status color ("Disponibilidad" view). */
  showStatus: boolean;
  /** Units for sale: kept lightly tinted so the user sees which ones carry information. */
  availableIds?: Set<string>;
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
  config = CATALUNA_CONFIG,
  castShadow = true,
  apartmentColors,
  dimmedIds,
  showStatus,
  availableIds,
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
  // The units' volumes are the facade's render: one lightly textured material for all of
  // them, and an invisible one for an opened unit (still the click target).
  const unitMaterials = useMemo(
    () => ({
      shown: addRenderTexture(
        new THREE.MeshStandardMaterial({ color: CATALUNA_PALETTE.wall, roughness: 0.92 }),
      ),
      hidden: new THREE.MeshStandardMaterial({ visible: false }),
    }),
    [],
  );
  useEffect(
    () => () => {
      unitMaterials.shown.dispose();
      unitMaterials.hidden.dispose();
    },
    [unitMaterials],
  );

  const { floors, floorHeight, groundFloorHeight: G, buildingWidth: W, buildingDepth: D } = config;
  const clear = floorHeight - config.slabThickness;
  const lastSolidFloor = focusFloor ?? floors;
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

      {/* Facade, ground floor, slabs, core and roof. With a floor isolated, its ceiling goes
          too: the units read from above. */}
      <CatalunaArchitecture
        config={config}
        topFloor={lastSolidFloor}
        roofVisible={roofVisible}
        castShadow={castShadow}
      />

      {/* Units: the volume behind the facade (and the click target), then the status shell. */}
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
              material={open ? unitMaterials.hidden : unitMaterials.shown}
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
              {/* Opened unit: the box stays as the click target but is not drawn. */}
              <boxGeometry args={[apt.size[0], clear, apt.size[2]]} />
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
                      : availableIds?.has(apt.id) && !dimmedIds.has(apt.id)
                        ? "available"
                        : "hidden"
              }
            />
          </group>
        );
      })}

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

type ShellMode = "hidden" | "available" | "status" | "dimmed" | "hovered" | "selected";

const SHELL_OPACITY: Record<ShellMode, number> = {
  hidden: 0,
  available: 0.24,
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
