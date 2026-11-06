import camaraExterior from "@/data/comparaciones/camara-exterior.json";

/**
 * Camera that reproduces the studio's exterior render on schependomlaan.glb (GLB
 * coordinates). Used by the "Fidelidad" comparison images and by the homepage intro, where
 * the render fades into the live 3D from this exact viewpoint.
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

export const RENDER_IMAGE = {
  src: "/comparaciones/exterior-proyecto.webp",
  srcMobile: "/comparaciones/exterior-proyecto-960.webp",
};

/**
 * Projection terms of the render camera, cropped to a frame of another aspect the way CSS
 * `object-fit: cover` (centered) crops the render image, so both stay aligned.
 * Returns the matrix elements that differ from a plain perspective projection.
 */
export function renderProjection(frameAspect: number) {
  const { aspect, fov, lensShift, horizontalStretch } = RENDER_CAMERA;
  const f = 1 / Math.tan((fov * Math.PI) / 360);
  // Frame narrower than the image: its sides are cut off. Wider: top and bottom are.
  const sx = frameAspect < aspect ? aspect / frameAspect : 1;
  const sy = frameAspect > aspect ? frameAspect / aspect : 1;
  return {
    e0: (f / aspect) * horizontalStretch * sx,
    e5: f * sy,
    e8: lensShift.x * sx,
    e9: lensShift.y * sy,
  };
}

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
