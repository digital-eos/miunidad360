import { floorLevels } from "./dataset";

/** Vertical slice of the model kept visible when a single floor is isolated. */
export type FloorRange = { min: number; max: number };

// `floorLevels[].top` is each storey's ceiling (the underside of the slab above).
const STOREY_HEIGHT =
  floorLevels.length > 1 ? floorLevels[1].top - floorLevels[0].top : 3;
// Includes the slab the floor stands on, so the isolated floor doesn't float.
const SLAB_MARGIN = 0.06;
// Plan-style cut height above the finished floor, like an architectural floor plan.
const PLAN_CUT_ABOVE_CEILING = 1.5;

/**
 * The slice to keep for one floor. "corte" cuts at plan height (walls and openings read as a
 * floor plan); "unidades" keeps the full storey height but drops the slab above.
 */
export function floorRange(floor: number, mode: "corte" | "unidades"): FloorRange | null {
  const level = floorLevels.find((f) => f.floor === floor);
  if (!level) return null;
  const min = level.top - STOREY_HEIGHT - SLAB_MARGIN;
  const max = mode === "corte" ? level.top - PLAN_CUT_ABOVE_CEILING : level.top - 0.02;
  return { min, max };
}

/** The floor at a given height (clicks on the roof pick the top floor, below ground the lowest). */
export function floorAtHeight(y: number): number | null {
  if (floorLevels.length === 0) return null;
  let found = floorLevels[0].floor;
  for (const level of floorLevels) {
    if (y >= level.top - STOREY_HEIGHT) found = level.floor;
  }
  return found;
}

// In "unidades", walls of the picked floor are kept as low stubs, like a cut-away maquette.
const REVEAL_CUT_ABOVE_FLOOR = 1.2;

/** Height above which the building lifts away when one floor is picked in "unidades". */
export function floorRevealCut(floor: number): number | null {
  const level = floorLevels.find((f) => f.floor === floor);
  return level ? level.top - STOREY_HEIGHT + REVEAL_CUT_ABOVE_FLOOR : null;
}

/** Vertical middle of a floor, for pointing the camera at it. */
export function floorMidHeight(floor: number): number | null {
  const level = floorLevels.find((f) => f.floor === floor);
  return level ? level.top - STOREY_HEIGHT / 2 : null;
}
