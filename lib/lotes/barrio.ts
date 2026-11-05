/**
 * "Barrio Demo": a fictitious gated neighbourhood generated in code. Everything here is
 * deterministic, so the seed (db/seed.ts), the 3D view and the 2D plan all agree on every
 * lot's shape, number and derived data.
 *
 * Plane coordinates are meters as [x, z]: +x is east, -z is north (three.js convention).
 */

export type Vec2 = [number, number];
export type Poly = Vec2[];

export type LoteGeom = {
  numero: number;
  codigo: string;
  manzana: number;
  poligono: Poly;
  centro: Vec2;
  /** Unit vector from the lot towards the street it fronts. */
  normalFrente: Vec2;
  frenteM: number;
  fondoM: number;
  superficieM2: number;
  orientacion: string;
  esquina: boolean;
  frenteLaguna: boolean;
  distanciaLagunaM: number;
  distanciaClubHouseM: number;
};

export type ManzanaGeom = { numero: number; poligono: Poly; centro: Vec2 };

// ─── Layout ──────────────────────────────────────────────────────────────────

type ManzanaSpec = {
  numero: number;
  centro: Vec2;
  /** World axis along the lots' street frontage. */
  eje: "x" | "z";
  largo: number;
  fondoTotal: number;
  /** Offset of the line between the two rows of lots, from the block's middle. */
  divisor: number;
  lotesPorFila: [number, number];
  /** Meters cut off the start / end of the block on its first-row side (a slanted end). */
  recorteInicio?: number;
  recorteFin?: number;
  semilla: number;
};

const MANZANAS: ManzanaSpec[] = [
  { numero: 1, centro: [-122, -54], eje: "x", largo: 110, fondoTotal: 84, divisor: -3, lotesPorFila: [5, 5], recorteInicio: 18, semilla: 11 },
  { numero: 2, centro: [0, -54], eje: "z", largo: 84, fondoTotal: 110, divisor: 0, lotesPorFila: [5, 5], semilla: 23 },
  { numero: 3, centro: [122, -54], eje: "x", largo: 110, fondoTotal: 84, divisor: 3, lotesPorFila: [5, 5], recorteFin: 18, semilla: 37 },
  { numero: 4, centro: [-122, 54], eje: "x", largo: 110, fondoTotal: 84, divisor: 4, lotesPorFila: [5, 5], semilla: 41 },
  { numero: 5, centro: [0, 54], eje: "z", largo: 84, fondoTotal: 110, divisor: 0, lotesPorFila: [5, 5], semilla: 53 },
  { numero: 6, centro: [122, 54], eje: "x", largo: 110, fondoTotal: 84, divisor: -4, lotesPorFila: [5, 5], semilla: 67 },
];

const OCHAVA_M = 5;

export const LAGUNA_CENTRO: Vec2 = [0, -168];
const LAGUNA_RX = 165;
const LAGUNA_RZ = 44;
export const NIVEL_AGUA = -1;

export const CLUB_HOUSE: Vec2 = [-75, 152];
export const CANCHAS_PADEL: { centro: Vec2; ancho: number; largo: number }[] = [
  { centro: [-150, 146], ancho: 10, largo: 20 },
  { centro: [-136, 146], ancho: 10, largo: 20 },
  { centro: [-122, 146], ancho: 10, largo: 20 },
];
export const PLAZA: { centro: Vec2; radio: number } = { centro: [80, 152], radio: 24 };
export const GUARDIA: Vec2 = [0, 212];

/** Paved areas: ring road, internal streets, entrance and club-house parking. */
export const CALLES: Poly[] = [
  [
    [-171, -108],
    [171, -108],
    [189, -12],
    [189, 108],
    [-189, 108],
    [-189, -12],
  ],
  rect(-9, 108, 9, 262),
  rect(-110, 108, -40, 128),
];

/** Green medians drawn over the paving. */
export const CANTEROS: Poly[] = [
  rect(-172, -3, -72, 3),
  rect(-50, -3, 50, 3),
  rect(72, -3, 172, 3),
  rect(-1.6, 122, 1.6, 200),
];

export const TERRENO = { minX: -330, maxX: 330, minZ: -290, maxZ: 290 };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rect(x0: number, z0: number, x1: number, z1: number): Poly {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

export function seeded(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function polygonArea(poly: Poly): number {
  let a = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const [x1, z1] = poly[i];
    const [x2, z2] = poly[(i + 1) % poly.length];
    a += x1 * z2 - x2 * z1;
  }
  return Math.abs(a) / 2;
}

export function polygonCentroid(poly: Poly): Vec2 {
  let x = 0;
  let z = 0;
  for (const p of poly) {
    x += p[0];
    z += p[1];
  }
  return [x / poly.length, z / poly.length];
}

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function segmentDistance(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len2 = dx * dx + dz * dz;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / len2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dz));
}

export function pointInPolygon(p: Vec2, poly: Poly): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function polygonDistance(p: Vec2, poly: Poly): number {
  if (pointInPolygon(p, poly)) return 0;
  let d = Infinity;
  for (let i = 0; i < poly.length; i += 1) {
    d = Math.min(d, segmentDistance(p, poly[i], poly[(i + 1) % poly.length]));
  }
  return d;
}

/**
 * Shrinks a convex polygon by `d` meters on every edge (offsets each edge inward and
 * intersects neighbours), so adjacent lots show a thin gap between them.
 */
export function insetPolygon(poly: Poly, d: number): Poly {
  const n = poly.length;
  const area2 = poly.reduce((acc, [x1, z1], i) => {
    const [x2, z2] = poly[(i + 1) % n];
    return acc + x1 * z2 - x2 * z1;
  }, 0);
  const sign = area2 > 0 ? 1 : -1;
  const lines = poly.map((a, i) => {
    const b = poly[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    // Inward normal for this winding.
    const nx = (-(b[1] - a[1]) / len) * sign;
    const nz = ((b[0] - a[0]) / len) * sign;
    return { p: [a[0] + nx * d, a[1] + nz * d] as Vec2, dir: [b[0] - a[0], b[1] - a[1]] as Vec2 };
  });
  return lines.map((cur, i) => {
    const prev = lines[(i - 1 + n) % n];
    const cross = prev.dir[0] * cur.dir[1] - prev.dir[1] * cur.dir[0];
    if (Math.abs(cross) < 1e-9) return cur.p;
    const t =
      ((cur.p[0] - prev.p[0]) * cur.dir[1] - (cur.p[1] - prev.p[1]) * cur.dir[0]) / cross;
    return [prev.p[0] + prev.dir[0] * t, prev.p[1] + prev.dir[1] * t] as Vec2;
  });
}

/** Replaces corner `index` by a chamfer ("ochava") of `size` meters along both edges. */
function chamfer(poly: Poly, index: number, size: number): Poly {
  const n = poly.length;
  const v = poly[index];
  const prev = poly[(index - 1 + n) % n];
  const next = poly[(index + 1) % n];
  const towards = (from: Vec2, to: Vec2): Vec2 => {
    const d = dist(from, to);
    return [from[0] + ((to[0] - from[0]) / d) * size, from[1] + ((to[1] - from[1]) / d) * size];
  };
  return [...poly.slice(0, index), towards(v, prev), towards(v, next), ...poly.slice(index + 1)];
}

const BEARINGS = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];

/** Compass label of a plane direction (north = -z). */
export function bearingLabel(dir: Vec2): string {
  const deg = (Math.atan2(dir[0], -dir[1]) * 180) / Math.PI;
  const index = Math.round(((deg + 360) % 360) / 45) % 8;
  return BEARINGS[index];
}

// ─── Laguna & terrain ────────────────────────────────────────────────────────

function lagunaRadiusFactor(theta: number): number {
  return 1 + 0.07 * Math.sin(3 * theta + 0.5) + 0.04 * Math.cos(5 * theta);
}

/** The lagoon's shoreline as a closed polygon. */
export const LAGUNA: Poly = Array.from({ length: 96 }, (_, i) => {
  const theta = (i / 96) * Math.PI * 2;
  const f = lagunaRadiusFactor(theta);
  return [
    LAGUNA_CENTRO[0] + Math.cos(theta) * LAGUNA_RX * f,
    LAGUNA_CENTRO[1] + Math.sin(theta) * LAGUNA_RZ * f,
  ] as Vec2;
});

/** 1 on the shoreline, < 1 inside the lagoon. */
function lagunaRho(x: number, z: number): number {
  const dx = (x - LAGUNA_CENTRO[0]) / LAGUNA_RX;
  const dz = (z - LAGUNA_CENTRO[1]) / LAGUNA_RZ;
  const theta = Math.atan2(dz, dx);
  return Math.hypot(dx, dz) / lagunaRadiusFactor(theta);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Gently rolling ground, dipping into a basin under the lagoon (meters). */
export function terrainHeight(x: number, z: number): number {
  const rolling =
    0.8 * Math.sin(x / 85 + 0.7) * Math.cos(z / 70 - 0.3) + 0.45 * Math.sin((x - z) / 48 + 1.1);
  const rho = lagunaRho(x, z);
  if (rho >= 1.3) return rolling;
  const t = smoothstep(1.3, 1, rho);
  const basin = -1.6 - 1.4 * (1 - Math.min(rho, 1));
  return rolling + (basin - rolling) * t;
}

// ─── Blocks & lots ───────────────────────────────────────────────────────────

function buildManzana(spec: ManzanaSpec, firstNumber: number): { manzana: ManzanaGeom; lotes: LoteGeom[] } {
  const halfL = spec.largo / 2;
  const halfD = spec.fondoTotal / 2;
  const toWorld = (u: number, v: number): Vec2 =>
    spec.eje === "x" ? [spec.centro[0] + u, spec.centro[1] + v] : [spec.centro[0] + v, spec.centro[1] + u];
  const normalWorld = (nv: number): Vec2 => (spec.eje === "x" ? [0, nv] : [nv, 0]);

  // Slanted ends shorten the first-row side (v = -halfD) of the block.
  const slant = (v: number) => (halfD - v) / spec.fondoTotal;
  const uMin = (v: number) => -halfL + (spec.recorteInicio ?? 0) * slant(v);
  const uMax = (v: number) => halfL - (spec.recorteFin ?? 0) * slant(v);

  const manzana: ManzanaGeom = {
    numero: spec.numero,
    poligono: [
      toWorld(uMin(-halfD), -halfD),
      toWorld(uMax(-halfD), -halfD),
      toWorld(uMax(halfD), halfD),
      toWorld(uMin(halfD), halfD),
    ],
    centro: toWorld(0, 0),
  };

  const lotes: LoteGeom[] = [];
  let numero = firstNumber;

  spec.lotesPorFila.forEach((count, row) => {
    const vFront = row === 0 ? -halfD : halfD;
    const vBack = spec.divisor;
    const weights = Array.from({ length: count }, (_, i) => 0.78 + seeded(spec.semilla * 7 + row * 31 + i) * 0.44);
    // A slanted end eats into its end lot, more on the first row: widen that lot to compensate.
    const avgWidth = spec.largo / count;
    const slantShare = row === 0 ? 0.75 : 0.3;
    if (spec.recorteInicio) weights[0] += (spec.recorteInicio * slantShare) / avgWidth;
    if (spec.recorteFin) weights[count - 1] += (spec.recorteFin * slantShare) / avgWidth;
    const total = weights.reduce((a, b) => a + b, 0);
    const dividers = [-halfL];
    for (const w of weights) dividers.push(dividers[dividers.length - 1] + (w / total) * spec.largo);

    for (let i = 0; i < count; i += 1) {
      const left = (v: number) => (i === 0 ? uMin(v) : dividers[i]);
      const right = (v: number) => (i === count - 1 ? uMax(v) : dividers[i + 1]);
      // Front edge first: [front-left, front-right, back-right, back-left].
      let poly: Poly = [
        toWorld(left(vFront), vFront),
        toWorld(right(vFront), vFront),
        toWorld(right(vBack), vBack),
        toWorld(left(vBack), vBack),
      ];
      const frenteM = dist(poly[0], poly[1]);
      const esquina = i === 0 || i === count - 1;
      if (i === count - 1) poly = chamfer(poly, 1, OCHAVA_M);
      if (i === 0) poly = chamfer(poly, 0, OCHAVA_M);

      const normal = normalWorld(row === 0 ? -1 : 1);
      const centro = polygonCentroid(poly);
      const frontMid: Vec2 = [
        (toWorld((left(vFront) + right(vFront)) / 2, vFront)[0]),
        (toWorld((left(vFront) + right(vFront)) / 2, vFront)[1]),
      ];
      const distanciaLaguna = polygonDistance(centro, LAGUNA);
      const frontToLaguna = polygonDistance(frontMid, LAGUNA);

      lotes.push({
        numero,
        codigo: `Lote ${numero}`,
        manzana: spec.numero,
        poligono: poly,
        centro,
        normalFrente: normal,
        frenteM: Math.round(frenteM * 10) / 10,
        fondoM: Math.round(Math.abs(vBack - vFront) * 10) / 10,
        superficieM2: Math.round(polygonArea(poly)),
        orientacion: bearingLabel(normal),
        esquina,
        frenteLaguna: normal[1] < -0.7 && frontToLaguna < 45,
        distanciaLagunaM: Math.round(distanciaLaguna / 10) * 10,
        distanciaClubHouseM: Math.round(dist(centro, CLUB_HOUSE) / 10) * 10,
      });
      numero += 1;
    }
  });

  return { manzana, lotes };
}

function buildBarrio() {
  const manzanas: ManzanaGeom[] = [];
  const lotes: LoteGeom[] = [];
  for (const spec of MANZANAS) {
    const built = buildManzana(spec, lotes.length + 1);
    manzanas.push(built.manzana);
    lotes.push(...built.lotes);
  }
  return { manzanas, lotes };
}

const barrio = buildBarrio();
export const MANZANA_GEOMS: ManzanaGeom[] = barrio.manzanas;
export const LOTE_GEOMS: LoteGeom[] = barrio.lotes;
export const LOTE_GEOMS_BY_CODIGO = new Map(LOTE_GEOMS.map((l) => [l.codigo, l]));
