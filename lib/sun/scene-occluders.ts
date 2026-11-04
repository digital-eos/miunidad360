import { type BuildingConfig, defaultBuildingConfig } from "@/lib/three/building-config";
import { generateNeighbors, generateTallNorthwestNeighbor } from "@/lib/three/context-layout";
import { boxFromCenterSize, type AABB } from "./occlusion";

/** The fixed set of volumes that can cast shadows on the building's facades for the sun study. */
export function buildSceneOccluders(config: BuildingConfig = defaultBuildingConfig): AABB[] {
  const neighbors = generateNeighbors(config);
  const tower = generateTallNorthwestNeighbor(config);
  return [...neighbors, tower].map((n) => boxFromCenterSize(n.position, n.size));
}
