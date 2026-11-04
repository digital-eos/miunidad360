import { type BuildingConfig, defaultBuildingConfig } from "@/lib/three/building-config";
import { generateApartmentLayout, sideNormal } from "@/lib/three/building-layout";

export type FacadePoint = {
  unitId: string;
  floor: number;
  /** Center of the apartment's main (balcony-facing) facade, nudged slightly outward. */
  position: [number, number, number];
  /** Outward-facing horizontal unit normal of that facade. */
  normal: [number, number];
};

const OUTWARD_OFFSET = 0.3;

/** One sample point per apartment, on its main (balcony) facade. */
export function buildFacadePoints(config: BuildingConfig = defaultBuildingConfig): FacadePoint[] {
  const layouts = generateApartmentLayout(config);

  return layouts.map((apt) => {
    const side = apt.balconySide;
    const [nx, nz] = sideNormal(side);
    const isNorthSouth = side === "north" || side === "south";

    const x = isNorthSouth ? apt.position[0] : apt.position[0] + nx * (apt.size[0] / 2 + OUTWARD_OFFSET);
    const z = isNorthSouth ? apt.position[2] + nz * (apt.size[2] / 2 + OUTWARD_OFFSET) : apt.position[2];

    return {
      unitId: apt.id,
      floor: apt.floor,
      position: [x, apt.position[1], z],
      normal: [nx, nz],
    };
  });
}
