import { type BuildingConfig, totalBuildingHeight } from "./building-config";

export type FramedViewpoint = {
  position: [number, number, number];
  target: [number, number, number];
};

export type MaquetaViewpoints = {
  aerial: FramedViewpoint;
  street: FramedViewpoint;
  facade: FramedViewpoint;
};

/** Breathing room left around the framed volume. */
const FRAME_MARGIN = 0.2;
/** Never let a camera rest closer than this to the building's volumes (meters). */
const MIN_CLEARANCE = 4;
/** Eye-level height for the street viewpoint (meters). */
const EYE_HEIGHT = 1.7;

function halfFovRad(fovDeg: number): number {
  return (fovDeg * Math.PI) / 180 / 2;
}

/**
 * Distance along the view axis so a box of half-width `halfWidth` and
 * half-height `halfHeight`, centered on the camera's boresight, fits inside
 * a `fovDeg` (vertical) frustum at `aspect`, with `margin` of extra room.
 */
function fitDistance(
  halfWidth: number,
  halfHeight: number,
  fovDeg: number,
  aspect: number,
  margin = FRAME_MARGIN,
): number {
  const vHalf = halfFovRad(fovDeg);
  const hHalf = Math.atan(Math.tan(vHalf) * aspect);
  const forHeight = (halfHeight * (1 + margin)) / Math.tan(vHalf);
  const forWidth = (halfWidth * (1 + margin)) / Math.tan(hHalf);
  return Math.max(forHeight, forWidth);
}

/** Distance so a sphere of `radius` fits inside the frustum from any direction, with margin. */
export function sphereFitDistance(
  radius: number,
  fovDeg: number,
  aspect: number,
  margin = FRAME_MARGIN,
): number {
  const vHalf = halfFovRad(fovDeg);
  const hHalf = Math.atan(Math.tan(vHalf) * aspect);
  const limiting = Math.min(vHalf, hHalf);
  return (radius * (1 + margin)) / Math.sin(limiting);
}

function vecLength(v: [number, number, number]): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function subtract(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/**
 * Camera viewpoints for the maqueta demo, computed from the building's
 * bounding box so the whole volume clears the frame (with margin) on any
 * aspect ratio, desktop or mobile portrait.
 */
export function computeMaquetaViewpoints(
  config: BuildingConfig,
  fovDeg: number,
  aspect: number,
): MaquetaViewpoints {
  const height = totalBuildingHeight(config);
  const halfW = config.buildingWidth / 2;
  const halfD = config.buildingDepth / 2;
  const halfH = height / 2;

  // Aerial: elevated 3/4 view. Framed via the building's bounding sphere so
  // the whole volume (plus the streets right around it) clears the frustum
  // regardless of the viewing angle. Elevation/azimuth match the original
  // "plongeante" composition.
  const sphereRadius = Math.sqrt(halfW * halfW + halfD * halfD + halfH * halfH);
  const aerialDistance = Math.max(
    sphereFitDistance(sphereRadius, fovDeg, aspect),
    MIN_CLEARANCE + sphereRadius,
  );
  const elevation = (63 * Math.PI) / 180;
  const azimuth = (47 * Math.PI) / 180;
  const aerial: FramedViewpoint = {
    position: [
      Math.cos(elevation) * Math.sin(azimuth) * aerialDistance,
      halfH + Math.sin(elevation) * aerialDistance,
      Math.cos(elevation) * Math.cos(azimuth) * aerialDistance,
    ],
    target: [0, height * 0.32, 0],
  };

  // Street: eye-level from the far sidewalk, looking slightly up at the
  // whole facade (contre-plongée). The target is centered at mid-height so
  // the box-fit below stays exact for the vertical extent.
  const streetSetback = Math.max(fitDistance(halfW, halfH, fovDeg, aspect), MIN_CLEARANCE);
  const street: FramedViewpoint = {
    position: [0, EYE_HEIGHT, halfD + streetSetback],
    target: [0, halfH, 0],
  };

  // Facade: dead-on frontal elevation, camera centered at mid-height.
  const facadeSetback = Math.max(fitDistance(halfW, halfH, fovDeg, aspect), MIN_CLEARANCE);
  const facade: FramedViewpoint = {
    position: [0, halfH, halfD + facadeSetback],
    target: [0, halfH, 0],
  };

  return { aerial, street, facade };
}

/** Orbit-control distance bounds that keep the camera from ever entering the building's footprint. */
export function maquetaOrbitDistanceBounds(
  config: BuildingConfig,
  viewpoints: MaquetaViewpoints,
): { minDistance: number; maxDistance: number } {
  const halfW = config.buildingWidth / 2;
  const halfD = config.buildingDepth / 2;
  const minDistance = Math.max(halfW, halfD) + MIN_CLEARANCE;

  const farthest = Math.max(
    vecLength(subtract(viewpoints.aerial.position, viewpoints.aerial.target)),
    vecLength(subtract(viewpoints.street.position, viewpoints.street.target)),
    vecLength(subtract(viewpoints.facade.position, viewpoints.facade.target)),
  );
  const maxDistance = farthest * 1.4;

  return { minDistance, maxDistance };
}
