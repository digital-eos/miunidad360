import { type BuildingConfig, defaultBuildingConfig, seededRandom } from "./building-config";

export type NeighborBox = {
  position: [number, number, number];
  size: [number, number, number];
  color: "light" | "mid";
};

export function plazaHalfExtent(config: BuildingConfig = defaultBuildingConfig): {
  halfW: number;
  halfD: number;
} {
  return { halfW: config.buildingWidth / 2 + 5, halfD: config.buildingDepth / 2 + 5 };
}

/** Deterministic (seeded) ring of neighboring building volumes around the plaza. */
export function generateNeighbors(config: BuildingConfig = defaultBuildingConfig): NeighborBox[] {
  const { halfW } = plazaHalfExtent(config);
  const items: NeighborBox[] = [];
  const count = 10;

  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + seededRandom(i * 3.1) * 0.4;
    const radius = halfW + 20 + seededRandom(i * 7.7) * 24;
    const width = 6 + seededRandom(i * 1.3) * 7;
    const depth = 6 + seededRandom(i * 2.9) * 7;
    const height = 7 + seededRandom(i * 5.1) * 22;
    const light = seededRandom(i * 9.3) > 0.5;
    items.push({
      position: [Math.cos(angle) * radius, height / 2, Math.sin(angle) * radius],
      size: [width, height, depth],
      color: light ? "light" : "mid",
    });
  }
  return items;
}

/**
 * A single, tall, deterministic neighbor placed just northwest of the plaza
 * (world +Z = north, -X = west) so its shadow falls visibly on the building —
 * used by the sun-study demo to make occlusion pedagogically obvious.
 */
export function generateTallNorthwestNeighbor(
  config: BuildingConfig = defaultBuildingConfig,
): NeighborBox {
  const { halfW, halfD } = plazaHalfExtent(config);
  const distance = Math.max(halfW, halfD) + 9;
  const dirX = -Math.SQRT1_2;
  const dirZ = Math.SQRT1_2;
  const height = config.groundFloorHeight + config.floors * config.floorHeight * 1.5;
  const width = 11;
  const depth = 11;

  return {
    position: [dirX * distance, height / 2, dirZ * distance],
    size: [width, height, depth],
    color: "mid",
  };
}
