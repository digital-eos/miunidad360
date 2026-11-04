import {
  APARTMENT_LETTERS,
  type ApartmentLetter,
  type BuildingConfig,
  apartmentId,
  defaultBuildingConfig,
} from "./building-config";

export type ExteriorSide = "north" | "south" | "east" | "west";

export type ApartmentLayout = {
  id: string;
  floor: number;
  letter: ApartmentLetter;
  /** Center position of the apartment volume. */
  position: [number, number, number];
  /** Full size of the apartment volume [width, height, depth]. */
  size: [number, number, number];
  /** Facades that sit on the building's outer perimeter (get windows). */
  exteriorSides: ExteriorSide[];
  /** The single facade that carries the balcony (street-facing side). */
  balconySide: ExteriorSide;
};

const QUADRANTS: Record<
  ApartmentLetter,
  { col: -1 | 1; row: -1 | 1; sides: ExteriorSide[]; balconySide: ExteriorSide }
> = {
  A: { col: -1, row: -1, sides: ["west", "south"], balconySide: "south" },
  B: { col: 1, row: -1, sides: ["east", "south"], balconySide: "south" },
  C: { col: -1, row: 1, sides: ["west", "north"], balconySide: "north" },
  D: { col: 1, row: 1, sides: ["east", "north"], balconySide: "north" },
};

export function generateApartmentLayout(
  config: BuildingConfig = defaultBuildingConfig,
): ApartmentLayout[] {
  const quadWidth = (config.buildingWidth - config.corridorGap) / 2;
  const quadDepth = (config.buildingDepth - config.corridorGap) / 2;

  const layouts: ApartmentLayout[] = [];

  for (let floor = 1; floor <= config.floors; floor += 1) {
    const floorBaseY = config.groundFloorHeight + (floor - 1) * config.floorHeight;
    const centerY = floorBaseY + config.floorHeight / 2;

    for (const letter of APARTMENT_LETTERS) {
      const quad = QUADRANTS[letter];
      const x = quad.col * (quadWidth / 2 + config.corridorGap / 2);
      const z = quad.row * (quadDepth / 2 + config.corridorGap / 2);

      layouts.push({
        id: apartmentId(floor, letter),
        floor,
        letter,
        position: [x, centerY, z],
        size: [quadWidth, config.floorHeight, quadDepth],
        exteriorSides: quad.sides,
        balconySide: quad.balconySide,
      });
    }
  }

  return layouts;
}

const ORIENTATION_BY_LETTER: Record<ApartmentLetter, string> = {
  A: "SO",
  B: "SE",
  C: "NO",
  D: "NE",
};

/** Cardinal-pair orientation (Argentine convention) for a given apartment letter. */
export function apartmentOrientation(letter: ApartmentLetter): string {
  return ORIENTATION_BY_LETTER[letter];
}

/** Outward unit normal for a given facade side. */
export function sideNormal(side: ExteriorSide): [number, number] {
  switch (side) {
    case "north":
      return [0, 1];
    case "south":
      return [0, -1];
    case "east":
      return [1, 0];
    case "west":
      return [-1, 0];
  }
}
