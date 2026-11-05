import rawDataset from "@/data/schependomlaan.json";
import { seededRandom } from "@/lib/three/building-config";
import type { UnitStatus } from "@/lib/units/demo-data";
import { attrNumber, type Unidad } from "@/lib/unidades/types";

export type BimGroup = {
  name: string;
  week: number;
  cat: string;
  transparent: boolean;
  tasks: string[];
};

export type BimApartment = {
  name: string;
  number: number;
  storey: string;
  floor: number;
  area_m2: number;
  bedrooms: number;
  rooms: number;
  centre: number[];
  top: number;
};

export type BimWeekEntry = { date: string; tasks: string[] };

export type BimDataset = {
  origin_date: string;
  groups: BimGroup[];
  apartments: BimApartment[];
  weeks: Record<string, BimWeekEntry>;
  size_m: number[];
};

export const bimDataset = rawDataset as BimDataset;

export const BIM_SIZE = {
  width: bimDataset.size_m[0],
  height: bimDataset.size_m[1],
  depth: bimDataset.size_m[2],
};

export const groupsByName = new Map(bimDataset.groups.map((g) => [g.name, g]));

/** Milestone weeks present in the dataset, ascending (not every integer week has a group). */
export const weekNumbers = Object.keys(bimDataset.weeks)
  .map(Number)
  .sort((a, b) => a - b);

export type FloorLevel = { floor: number; label: string; top: number };

/** One entry per distinct floor, in the apartments' own storey labels, sorted bottom to top. */
export const floorLevels: FloorLevel[] = (() => {
  const seen = new Map<number, FloorLevel>();
  for (const apt of bimDataset.apartments) {
    if (!seen.has(apt.floor)) seen.set(apt.floor, { floor: apt.floor, label: apt.storey, top: apt.top });
  }
  return [...seen.values()].sort((a, b) => a.floor - b.floor);
})();

/** Project slug of the Schependomlaan apartments in the `unidades` table. */
export const BIM_PROJECT_SLUG = "schependomlaan";

/** Fictitious baseline — this is a demo dataset, prices are illustrative only. */
const BASE_PRICE_PER_M2 = 2200;

function deriveStatus(seed: number): UnitStatus {
  const r = seededRandom(seed);
  if (r < 0.5) return "disponible";
  if (r < 0.75) return "reservada";
  return "vendida";
}

/**
 * The apartments as `unidades`, with the demo's illustrative price and status. This is what
 * db/seed.ts stores, and what the viewer shows until (or if) the API answers.
 */
export const bimFallbackUnidades: Unidad[] = bimDataset.apartments.map((apt, index) => {
  const floorPremium = 1 + apt.floor * 0.015;
  return {
    id: -(index + 1),
    proyectoId: 0,
    tipo: "departamento",
    codigo: `UF ${apt.number}`,
    sector: apt.storey,
    superficieM2: apt.area_m2,
    superficieTerrenoM2: null,
    orientacion: null,
    precio: Math.round((BASE_PRICE_PER_M2 * floorPremium * apt.area_m2) / 500) * 500,
    moneda: "USD",
    estado: deriveStatus(apt.number * 7.13),
    objeto3d: apt.name,
    atributos: { piso: apt.floor, ambientes: apt.rooms, dormitorios: apt.bedrooms },
  };
});

export const apartmentsByName = new Map(bimDataset.apartments.map((a) => [a.name, a]));

/** The BIM floor index of a unit (0 = planta baja), from its 3D object. */
export function unidadFloor(unidad: Unidad): number | null {
  const apt = unidad.objeto3d ? apartmentsByName.get(unidad.objeto3d) : undefined;
  return apt ? apt.floor : attrNumber(unidad, "piso");
}
