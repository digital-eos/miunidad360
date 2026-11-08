/** Breathing room left around the framed volume. */
const FRAME_MARGIN = 0.2;

function halfFovRad(fovDeg: number): number {
  return (fovDeg * Math.PI) / 180 / 2;
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
