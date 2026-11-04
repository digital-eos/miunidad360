import { APARTMENT_LETTERS, type ApartmentLetter, seededRandom } from "@/lib/three/building-config";
import { apartmentOrientation } from "@/lib/three/building-layout";

export type UnitStatus = "disponible" | "reservada" | "vendida";

export type UnitPlanProfile = {
  planType: string;
  rooms: number;
  bedrooms: number;
  areaM2: number;
  balconyM2: number;
  /** Base USD/m² at floor 1, before floor and orientation premiums. */
  basePricePerM2: number;
};

export const UNIT_PLAN_PROFILES: Record<ApartmentLetter, UnitPlanProfile> = {
  A: { planType: "A", rooms: 2, bedrooms: 1, areaM2: 48, balconyM2: 5, basePricePerM2: 2150 },
  B: { planType: "B", rooms: 3, bedrooms: 2, areaM2: 64, balconyM2: 7, basePricePerM2: 2200 },
  C: { planType: "C", rooms: 3, bedrooms: 2, areaM2: 67, balconyM2: 7, basePricePerM2: 2280 },
  D: { planType: "D", rooms: 4, bedrooms: 3, areaM2: 88, balconyM2: 10, basePricePerM2: 2320 },
};

/** North-facing units (NO/NE) catch more sun in Buenos Aires and command a premium. */
const NORTH_FACING_ORIENTATIONS = new Set(["NO", "NE"]);

export function computeUnitPrice(floor: number, letter: ApartmentLetter): number {
  const profile = UNIT_PLAN_PROFILES[letter];
  const orientation = apartmentOrientation(letter);
  const floorPremium = 1 + 0.007 * (floor - 1);
  const orientationPremium = NORTH_FACING_ORIENTATIONS.has(orientation) ? 1.04 : 1;
  const pricePerM2 = profile.basePricePerM2 * floorPremium * orientationPremium;
  const rawPrice = pricePerM2 * profile.areaM2;
  return Math.round(rawPrice / 1000) * 1000;
}

/**
 * Deterministic status distribution across all units of a project:
 * roughly 55% disponible, 15% reservada, 30% vendida.
 */
export function assignUnitStatuses(unitCount: number): UnitStatus[] {
  const reservedCount = Math.round(unitCount * 0.15);
  const soldCount = Math.round(unitCount * 0.3);
  const availableCount = unitCount - reservedCount - soldCount;

  const statuses: UnitStatus[] = [
    ...Array<UnitStatus>(availableCount).fill("disponible"),
    ...Array<UnitStatus>(reservedCount).fill("reservada"),
    ...Array<UnitStatus>(soldCount).fill("vendida"),
  ];

  // Deterministic seeded shuffle so re-seeding is reproducible.
  for (let i = statuses.length - 1; i > 0; i -= 1) {
    const j = Math.floor(seededRandom(i * 31.7 + 11) * (i + 1));
    [statuses[i], statuses[j]] = [statuses[j], statuses[i]];
  }

  return statuses;
}

export { APARTMENT_LETTERS };
