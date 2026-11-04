export const APARTMENT_LETTERS = ["A", "B", "C", "D"] as const;
export type ApartmentLetter = (typeof APARTMENT_LETTERS)[number];

export type BuildingConfig = {
  /** Number of residential floors stacked above the glazed ground floor. */
  floors: number;
  /** Apartments per floor. The procedural layout assumes a 2x2 grid (4). */
  apartmentsPerFloor: number;
  /** Height of a single residential floor slab-to-slab. */
  floorHeight: number;
  /** Height of the glazed ground floor (lobby). */
  groundFloorHeight: number;
  /** Height of the rooftop terrace parapet. */
  roofParapetHeight: number;
  /** Overall footprint width (along X). */
  buildingWidth: number;
  /** Overall footprint depth (along Z). */
  buildingDepth: number;
  /** Gap left between the two apartments on each axis, for the central corridor/core. */
  corridorGap: number;
  /** How far balconies project from the facade. */
  balconyDepth: number;
  /** How far windows are inset from the apartment's outer shell. */
  windowInset: number;
  /** Slab thickness between floors. */
  slabThickness: number;
};

export const defaultBuildingConfig: BuildingConfig = {
  floors: 12,
  apartmentsPerFloor: 4,
  floorHeight: 3.1,
  groundFloorHeight: 4.4,
  roofParapetHeight: 1.2,
  buildingWidth: 24,
  buildingDepth: 17,
  corridorGap: 0.8,
  balconyDepth: 1.5,
  windowInset: 0.1,
  slabThickness: 0.28,
};

/** Stable apartment identifier, e.g. "P04-B". */
export function apartmentId(floor: number, letter: ApartmentLetter): string {
  return `P${String(floor).padStart(2, "0")}-${letter}`;
}

export function totalBuildingHeight(config: BuildingConfig = defaultBuildingConfig): number {
  return config.groundFloorHeight + config.floors * config.floorHeight + config.roofParapetHeight;
}

/** Deterministic pseudo-random float in [0, 1) derived from a seed. */
export function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}
