import {
  CALLES,
  CANCHAS_PADEL,
  CANTEROS,
  CLUB_HOUSE,
  LAGUNA,
  LAGUNA_CENTRO,
  MANZANA_GEOMS,
  PLAZA,
  TERRENO,
  seeded,
  type Poly,
} from "./barrio";

export const GROUND_COLORS = {
  pasto: "#cdd9ad",
  pastoClaro: "#dce5c3",
  cantero: "#bfd09c",
  calle: "#e3dfd5",
  cordon: "#f5f2eb",
  arena: "#e8dec3",
  lecho: "#9cc0cc",
  pileta: "#86c6d6",
  solado: "#ebe4d3",
  padel: "#5f8fb3",
};

/** Canvas size for the ground texture; keeps the terrain's aspect ratio. */
export function groundTextureSize(width = 2048): { width: number; height: number } {
  const spanX = TERRENO.maxX - TERRENO.minX;
  const spanZ = TERRENO.maxZ - TERRENO.minZ;
  return { width, height: Math.round((width * spanZ) / spanX) };
}

/**
 * Paints the site plan (grass, streets, block lawns, lagoon shore, amenities) onto a 2D
 * canvas, used as the terrain's texture. Lots themselves are separate 3D slabs.
 */
export function paintGround(canvas: HTMLCanvasElement): void {
  const { width, height } = groundTextureSize(canvas.width);
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const spanX = TERRENO.maxX - TERRENO.minX;
  const spanZ = TERRENO.maxZ - TERRENO.minZ;
  const sx = width / spanX;
  const sz = height / spanZ;
  const px = (x: number) => (x - TERRENO.minX) * sx;
  const pz = (z: number) => (z - TERRENO.minZ) * sz;

  const path = (poly: Poly) => {
    ctx.beginPath();
    poly.forEach(([x, z], i) => (i === 0 ? ctx.moveTo(px(x), pz(z)) : ctx.lineTo(px(x), pz(z))));
    ctx.closePath();
  };
  const fill = (poly: Poly, color: string) => {
    path(poly);
    ctx.fillStyle = color;
    ctx.fill();
  };
  const rectM = (cx: number, cz: number, w: number, d: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(px(cx - w / 2), pz(cz - d / 2), w * sx, d * sz);
  };

  // Grass with a faint mottling so large areas don't look flat.
  ctx.fillStyle = GROUND_COLORS.pasto;
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 2600; i += 1) {
    const x = seeded(i * 1.7) * width;
    const y = seeded(i * 2.3 + 5) * height;
    const r = 6 + seeded(i * 3.1) * 22;
    ctx.fillStyle = seeded(i * 4.7) > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(80,100,40,0.05)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lagoon: sandy shore, then the darker bed seen through the water.
  const scaled = (poly: Poly, k: number): Poly =>
    poly.map(([x, z]) => [
      LAGUNA_CENTRO[0] + (x - LAGUNA_CENTRO[0]) * k,
      LAGUNA_CENTRO[1] + (z - LAGUNA_CENTRO[1]) * k,
    ]);
  fill(scaled(LAGUNA, 1.1), GROUND_COLORS.arena);
  fill(LAGUNA, GROUND_COLORS.lecho);

  // Streets with a light curb line.
  for (const calle of CALLES) fill(calle, GROUND_COLORS.calle);
  for (const manzana of MANZANA_GEOMS) {
    path(manzana.poligono);
    ctx.fillStyle = GROUND_COLORS.pastoClaro;
    ctx.fill();
    ctx.lineWidth = 0.8 * sx;
    ctx.strokeStyle = GROUND_COLORS.cordon;
    ctx.stroke();
  }
  for (const cantero of CANTEROS) fill(cantero, GROUND_COLORS.cantero);

  // Club house terrace and pool.
  rectM(CLUB_HOUSE[0], CLUB_HOUSE[1] + 4, 52, 34, GROUND_COLORS.solado);
  rectM(CLUB_HOUSE[0] + 8, CLUB_HOUSE[1] + 14, 20, 9, GROUND_COLORS.pileta);

  // Padel courts with their lines.
  for (const c of CANCHAS_PADEL) {
    rectM(c.centro[0], c.centro[1], c.ancho + 2, c.largo + 2, GROUND_COLORS.solado);
    rectM(c.centro[0], c.centro[1], c.ancho, c.largo, GROUND_COLORS.padel);
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 0.15 * sx;
    ctx.strokeRect(px(c.centro[0] - c.ancho / 2), pz(c.centro[1] - c.largo / 2), c.ancho * sx, c.largo * sz);
    ctx.beginPath();
    ctx.moveTo(px(c.centro[0] - c.ancho / 2), pz(c.centro[1]));
    ctx.lineTo(px(c.centro[0] + c.ancho / 2), pz(c.centro[1]));
    ctx.moveTo(px(c.centro[0]), pz(c.centro[1] - c.largo / 2 + 3));
    ctx.lineTo(px(c.centro[0]), pz(c.centro[1] + c.largo / 2 - 3));
    ctx.stroke();
  }
  // Path from the courts to the club house.
  rectM((CANCHAS_PADEL[2].centro[0] + CLUB_HOUSE[0]) / 2 - 4, CANCHAS_PADEL[0].centro[1], 40, 3, GROUND_COLORS.solado);

  // Plaza: paved ring, lawn, crossing paths, joined to the ring road.
  const [cx, cz] = PLAZA.centro;
  ctx.fillStyle = GROUND_COLORS.solado;
  ctx.beginPath();
  ctx.ellipse(px(cx), pz(cz), PLAZA.radio * sx, PLAZA.radio * sz, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = GROUND_COLORS.cantero;
  ctx.beginPath();
  ctx.ellipse(px(cx), pz(cz), (PLAZA.radio - 3) * sx, (PLAZA.radio - 3) * sz, 0, 0, Math.PI * 2);
  ctx.fill();
  rectM(cx, cz, PLAZA.radio * 2, 2.5, GROUND_COLORS.solado);
  rectM(cx, cz, 2.5, PLAZA.radio * 2, GROUND_COLORS.solado);
  rectM(cx, (108 + cz - PLAZA.radio) / 2, 3, cz - PLAZA.radio - 108 + 1, GROUND_COLORS.solado);
}
