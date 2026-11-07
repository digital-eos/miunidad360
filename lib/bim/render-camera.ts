import camaraExterior from "@/data/comparaciones/camara-exterior.json";

/**
 * Camera that reproduces the studio's exterior render on schependomlaan.glb (GLB
 * coordinates). Used for the "Fidelidad" comparison images; the neighborhood keeps its
 * sightline clear so the façade stays visible from there.
 */
export const RENDER_CAMERA = {
  position: camaraExterior.posicion as [number, number, number],
  target: camaraExterior.objetivo as [number, number, number],
  fov: camaraExterior.fov_vertical,
  /** Width / height of the render image (1920 × 1014). */
  aspect: camaraExterior.aspecto,
  lensShift: camaraExterior.desplazamiento_lente,
  horizontalStretch: camaraExterior.estiramiento_horizontal,
};

/**
 * Whether a ground point sits between the render camera and the building, inside its view:
 * the neighborhood keeps that sector clear so nothing hides the façade.
 */
export function isInRenderSightline(x: number, z: number, margin = 0) {
  const [cx, , cz] = RENDER_CAMERA.position;
  const [tx, , tz] = RENDER_CAMERA.target;
  const fx = tx - cx;
  const fz = tz - cz;
  const reach = Math.hypot(fx, fz);
  const dx = x - cx;
  const dz = z - cz;
  const ahead = (dx * fx + dz * fz) / reach;
  if (ahead <= 0 || ahead > reach) return false;
  const side = Math.abs(dx * fz - dz * fx) / reach;
  // Half the horizontal field of view, with some room for the cropped mobile frame.
  const halfAngle = (40 * Math.PI) / 180;
  return side < ahead * Math.tan(halfAngle) + margin;
}
