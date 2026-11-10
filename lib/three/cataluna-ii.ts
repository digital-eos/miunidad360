import type { BuildingConfig } from "./building-config";
import type { ApartmentLayout, ExteriorSide } from "./building-layout";
import type { Unidad } from "@/lib/unidades/types";

/**
 * Cataluña II (Buenos Aires 2771, Mar del Plata) as built in the developer's brochure,
 * "CATALUÑA 25.10.25.pdf":
 *
 * - Volume and facade: the daytime street elevation on page 1, scaled from the people on
 *   the sidewalk (≈50 px per meter at 2000 px wide). Frontage 10.5 m, 6 floors of 3.05 m
 *   over a 5.1 m ground floor (garage + raised entrance hall), terrace with pergola on top.
 *   Total ≈ 25.9 m from the sidewalk to the top of the roof frame, as in the render.
 * - Units: pages 11–21. Floor 1: monoambientes 101–103 + the common quincho; floors 2–3:
 *   three 2-ambientes units each; floors 4–6: two 3-ambientes semipisos each. 15 units.
 *
 * Scene frame (same as the rest of the selector): meters, +Y up, building centered at the
 * origin, +Z = the street facade (Buenos Aires street), +X = right as seen from the street.
 *
 * Not in the brochure, so estimated (see `docs/cataluna-ii-fachada.md`): the depth of the
 * building (22 m), where the party walls between units fall, and the rear facade.
 */

export const CATALUNA_SLUG = "cataluna-ii";

export const CATALUNA_CONFIG: BuildingConfig = {
  kind: "cataluna-ii",
  floors: 6,
  apartmentsPerFloor: 3,
  floorHeight: 3.05,
  groundFloorHeight: 5.1,
  // Roof frame and stair/lift block: 3 m above the roof slab.
  roofParapetHeight: 3.1,
  buildingWidth: 10.5,
  buildingDepth: 22,
  corridorGap: 0,
  balconyDepth: 0.9,
  windowInset: 0.03,
  slabThickness: 0.34,
};

/** Street-side unit zone: 8.7 m deep (unit 103 is 8.66 m from its entrance to the facade). */
export const FRONT_DEPTH = 8.7;
/** Stair, lift and landing between the street units and the rear ones. */
export const CORE_DEPTH = 4;

type Zone = "front-left" | "front-right" | "front" | "rear-left" | "rear";

type UnitProgram = {
  code: string;
  floor: number;
  zone: Zone;
  /** Interior and balcony surfaces from the unit sheets (pages 14–21). */
  areaM2: number;
  balconyM2: number;
  rooms: number;
  bedrooms: number;
  tipologia: string;
};

const MONO = "Monoambiente";
const DOS = "Dos ambientes";
const TRES = "Tres ambientes, semipiso";

/**
 * The 15 units. Which street unit is on the left is not stated in the brochure: lower
 * numbers are put on the left (102, 201, 301), 101 (no balcony) and the quincho at the rear.
 */
export const CATALUNA_UNITS: UnitProgram[] = [
  { code: "101", floor: 1, zone: "rear-left", areaM2: 31, balconyM2: 0, rooms: 1, bedrooms: 0, tipologia: MONO },
  { code: "102", floor: 1, zone: "front-left", areaM2: 36.8, balconyM2: 2.7, rooms: 1, bedrooms: 0, tipologia: MONO },
  { code: "103", floor: 1, zone: "front-right", areaM2: 38.7, balconyM2: 3.4, rooms: 1, bedrooms: 0, tipologia: MONO },
  ...[2, 3].flatMap((floor): UnitProgram[] => [
    { code: `${floor}01`, floor, zone: "front-left", areaM2: 49.8, balconyM2: 2.7, rooms: 2, bedrooms: 1, tipologia: DOS },
    { code: `${floor}02`, floor, zone: "front-right", areaM2: 48.9, balconyM2: 3.4, rooms: 2, bedrooms: 1, tipologia: DOS },
    { code: `${floor}03`, floor, zone: "rear", areaM2: 45.1, balconyM2: 6.5, rooms: 2, bedrooms: 1, tipologia: DOS },
  ]),
  ...[4, 5, 6].flatMap((floor): UnitProgram[] => [
    { code: `${floor}01`, floor, zone: "rear", areaM2: 45.1, balconyM2: 6.5, rooms: 3, bedrooms: 2, tipologia: TRES },
    { code: `${floor}02`, floor, zone: "front", areaM2: 67.6, balconyM2: 6.5, rooms: 3, bedrooms: 2, tipologia: TRES },
  ]),
];

/** Floor slab top (finished floor) of a residential floor. */
export function floorBaseY(floor: number, config: BuildingConfig = CATALUNA_CONFIG) {
  return config.groundFloorHeight + (floor - 1) * config.floorHeight;
}

/** x and z extents of a zone, in scene meters. */
export function zoneExtents(zone: Zone | "core" | "quincho", config: BuildingConfig = CATALUNA_CONFIG) {
  const halfW = config.buildingWidth / 2;
  const halfD = config.buildingDepth / 2;
  const frontZ: [number, number] = [halfD - FRONT_DEPTH, halfD];
  const coreZ: [number, number] = [frontZ[0] - CORE_DEPTH, frontZ[0]];
  const rearZ: [number, number] = [-halfD, coreZ[0]];
  const full: [number, number] = [-halfW, halfW];
  switch (zone) {
    case "front-left":
      return { x: [-halfW, 0] as [number, number], z: frontZ };
    case "front-right":
      return { x: [0, halfW] as [number, number], z: frontZ };
    case "front":
      return { x: full, z: frontZ };
    case "rear-left":
      return { x: [-halfW, 0] as [number, number], z: rearZ };
    case "quincho":
      return { x: [0, halfW] as [number, number], z: rearZ };
    case "rear":
      return { x: full, z: rearZ };
    case "core":
      return { x: full, z: coreZ };
  }
}

function exteriorSides(zone: Zone): ExteriorSide[] {
  switch (zone) {
    case "front-left":
      return ["north", "west"];
    case "front-right":
      return ["north", "east"];
    case "front":
      return ["north", "west", "east"];
    case "rear-left":
      return ["south", "west"];
    case "rear":
      return ["south", "west", "east"];
  }
}

/** Unit volumes, in the selector's layout format (ids = the brochure's unit numbers). */
export function catalunaLayout(config: BuildingConfig = CATALUNA_CONFIG): ApartmentLayout[] {
  return CATALUNA_UNITS.map((unit) => {
    const { x, z } = zoneExtents(unit.zone, config);
    const y0 = floorBaseY(unit.floor, config);
    const sides = exteriorSides(unit.zone);
    return {
      id: unit.code,
      floor: unit.floor,
      letter: unit.code.slice(-1),
      position: [(x[0] + x[1]) / 2, y0 + config.floorHeight / 2, (z[0] + z[1]) / 2],
      size: [x[1] - x[0], config.floorHeight, z[1] - z[0]],
      exteriorSides: sides,
      // +Z ("north" in the layout's naming) is the street facade.
      balconySide: sides[0],
    };
  });
}

// ---------------------------------------------------------------------------------------
// Street facade (page 1)

/**
 * Grey frame boxes alternate floor by floor: floors 1, 3, 5 frame the center and right bays,
 * floors 2 and 4 the left and center bays, floor 6 the whole width.
 */
export type FrameKind = "left" | "right" | "full";

export function frameKind(floor: number): FrameKind {
  if (floor >= 6) return "full";
  return floor % 2 === 1 ? "right" : "left";
}

/** Frame extents (x) per kind, measured on page 1. */
export const FRAME_X: Record<FrameKind, [number, number]> = {
  left: [-5.25, 1.6],
  right: [-1.9, 5.25],
  full: [-5.3, 5.3],
};

export type WindowSpec = {
  x: [number, number];
  /** Pane widths as fractions of the window (sliding leaves + fixed panes). */
  panes: number[];
  /** Panes with a transom at guard height (fixed lower glass instead of a railing). */
  transom: number[];
  height: number;
};

/** The three bays repeated on every floor: left (3 panes), center (2 panes), right (3 panes). */
export const STREET_WINDOWS: WindowSpec[] = [
  { x: [-4.52, -1.96], panes: [0.35, 0.32, 0.33], transom: [], height: 2.3 },
  { x: [-0.9, 0.86], panes: [0.5, 0.5], transom: [0, 1], height: 2.3 },
  { x: [1.68, 4.52], panes: [0.3, 0.4, 0.3], transom: [2], height: 2.3 },
];

/** Railings (x extents) per floor: wide inside a frame, short on the unframed side. */
export function streetRailings(floor: number): { x: [number, number]; framed: boolean }[] {
  const kind = frameKind(floor);
  if (kind === "full") return [{ x: [-5.1, 5.1], framed: true }];
  if (kind === "left") {
    return [
      { x: [-5.1, -1.8], framed: true },
      { x: [1.34, 3.76], framed: false },
    ];
  }
  return [
    { x: [-3.8, -1.96], framed: false },
    { x: [1.34, 5.08], framed: true },
  ];
}

// ---------------------------------------------------------------------------------------
// Unit data (served by the API until the project is seeded in the database)

/**
 * Demo prices (USD) and sale states. Fictional: the brochure gives neither. The selector
 * says so under its unit list ("Precios y estados ficticios, solo para esta demo").
 */
const DEMO_PRICES: Record<string, number> = {
  "101": 68_000, "102": 82_000, "103": 86_000,
  "201": 109_000, "202": 107_000, "203": 98_000,
  "301": 112_000, "302": 110_000, "303": 101_000,
  "401": 104_000, "402": 152_000,
  "501": 107_000, "502": 157_000,
  "601": 111_000, "602": 163_000,
};
const DEMO_STATES: Record<string, Unidad["estado"]> = {
  "203": "reservada",
  "301": "vendida",
  "501": "reservada",
};

export function catalunaUnidades(): Unidad[] {
  return CATALUNA_UNITS.map((unit, i) => ({
    id: i + 1,
    proyectoId: 0,
    tipo: "departamento",
    codigo: unit.code,
    sector: `Piso ${unit.floor}`,
    superficieM2: unit.areaM2,
    superficieTerrenoM2: null,
    // Street facade faces bearing 123° (≈ SE), the rear 303° (≈ NO).
    orientacion: unit.zone.startsWith("rear") ? "NO" : "SE",
    precio: DEMO_PRICES[unit.code] ?? null,
    moneda: "USD",
    estado: DEMO_STATES[unit.code] ?? "disponible",
    objeto3d: unit.code,
    atributos: {
      piso: unit.floor,
      ambientes: unit.rooms,
      dormitorios: unit.bedrooms,
      balcon_m2: unit.balconyM2,
      tipologia: unit.tipologia,
      ubicacion: unit.zone.startsWith("rear") ? "Contrafrente" : "Frente",
    },
  }));
}

export const CATALUNA_PROJECT = {
  slug: CATALUNA_SLUG,
  name: "Cataluña II",
  address: "Buenos Aires 2771",
  city: "Mar del Plata, Argentina",
  latitude: -38.010459,
  longitude: -57.548978,
  description:
    "Cataluña II, de Cataluña Desarrollos Inmobiliarios. 15 unidades de 1, 2 y 3 ambientes. Precios y estados de esta demo: ficticios.",
};
