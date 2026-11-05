import rawDataset from "@/data/schependomlaan.json";
import { seededRandom } from "@/lib/three/building-config";
import type { UnitStatus } from "@/lib/units/demo-data";

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

export type BimUnit = BimApartment & {
  status: UnitStatus;
  priceUsd: number;
};

/** Fictitious baseline — this is a demo dataset, prices are illustrative only. */
const BASE_PRICE_PER_M2 = 2200;

function deriveStatus(seed: number): UnitStatus {
  const r = seededRandom(seed);
  if (r < 0.5) return "disponible";
  if (r < 0.75) return "reservada";
  return "vendida";
}

export const bimUnits: BimUnit[] = bimDataset.apartments.map((apt) => {
  const status = deriveStatus(apt.number * 7.13);
  const floorPremium = 1 + apt.floor * 0.015;
  const priceUsd = Math.round((BASE_PRICE_PER_M2 * floorPremium * apt.area_m2) / 500) * 500;
  return { ...apt, status, priceUsd };
});

export const bimUnitsByName = new Map(bimUnits.map((u) => [u.name, u]));
