import type { BuildingConfig } from "./building-config";
import {
  CATALUNA_CONFIG,
  FRAME_X,
  STREET_WINDOWS,
  frameKind,
  floorBaseY,
  streetRailings,
  zoneExtents,
} from "./cataluna-ii";

/**
 * Cataluña II's architecture as a list of solid parts (boxes, cylinders, blobs), each tagged
 * with a material and the level it belongs to, so the scene can merge them into a few meshes
 * and hide the floors above an isolated one. Pure data: no Three.js objects here.
 *
 * Levels: 0 = ground floor, 1–6 = residential floors (with the slab under them),
 * 7 = roof (roof slab, terrace, frame, pergola, stair/lift block, plants).
 *
 * Every measure comes from page 1 of the brochure unless the comment says otherwise.
 */

export type ArchMaterial =
  | "wall"
  | "frame"
  | "white"
  | "black"
  | "glass"
  | "curtain"
  | "dark"
  | "deck"
  | "block"
  | "green"
  | "greenDark"
  | "trunk"
  | "planter"
  | "hall"
  | "hallGlass";

type V3 = [number, number, number];
type Range = [number, number];

export type ArchShape =
  | { kind: "box"; min: V3; max: V3 }
  /** Box of `size` centered at `center`, rotated by Euler angles (order YZX). */
  | { kind: "obox"; center: V3; size: V3; rotation: V3 }
  | { kind: "cyl"; center: V3; radius: number; height: number }
  | { kind: "blob"; center: V3; radius: number };

export type ArchPart = { level: number; material: ArchMaterial; shape: ArchShape };

/** Height of the black bar railings (page 1: ≈ 1.0 m, bars every ≈ 12 cm). */
const RAIL_H = 1.0;
const BAR_STEP = 0.12;
/** Grey frames and balconies project this much from the street wall. */
const FRAME_DEPTH = 0.9;
const FRAME_BAND = 0.22;
const FRAME_SIDE = 0.18;
/** Brochure entrance: four risers up to the raised hall. */
const STEP_RISE = 0.17;
const STEP_RUN = 0.3;
const HALL_FLOOR = STEP_RISE * 4;

/** Deterministic pseudo-random in [0, 1). */
function rand(seed: number) {
  const x = Math.sin(seed * 91.17 + 12.3) * 43758.5453;
  return x - Math.floor(x);
}

const sorted = (a: number, b: number): Range => (a < b ? [a, b] : [b, a]);

export function buildCatalunaParts(config: BuildingConfig = CATALUNA_CONFIG): ArchPart[] {
  const parts: ArchPart[] = [];
  const {
    buildingWidth: W,
    buildingDepth: D,
    groundFloorHeight: G,
    floorHeight: FH,
    slabThickness: S,
    floors,
  } = config;
  const hw = W / 2;
  const hd = D / 2;
  /** Street wall plane. */
  const zf = hd;
  const clear = FH - S;
  const roofY = G + floors * FH;
  const core = zoneExtents("core", config);
  let level = 0;

  const box = (material: ArchMaterial, x: Range, y: Range, z: Range) =>
    parts.push({ level, material, shape: { kind: "box", min: [x[0], y[0], z[0]], max: [x[1], y[1], z[1]] } });
  const obox = (material: ArchMaterial, center: V3, size: V3, rotation: V3) =>
    parts.push({ level, material, shape: { kind: "obox", center, size, rotation } });
  const cyl = (material: ArchMaterial, x: number, z: number, y: Range, radius: number) =>
    parts.push({
      level,
      material,
      shape: { kind: "cyl", center: [x, (y[0] + y[1]) / 2, z], radius, height: y[1] - y[0] },
    });
  const blob = (material: ArchMaterial, center: V3, radius: number) =>
    parts.push({ level, material, shape: { kind: "blob", center, radius } });

  // --- Helpers ------------------------------------------------------------------------

  /** Black bar railing along x, on the line z = `z`. */
  const railingX = (x: Range, y0: number, z: number, h = RAIL_H) => {
    box("black", x, [y0 + h - 0.05, y0 + h], [z - 0.025, z + 0.025]);
    box("black", x, [y0 + 0.08, y0 + 0.12], [z - 0.018, z + 0.018]);
    const n = Math.max(1, Math.round((x[1] - x[0]) / BAR_STEP));
    for (let i = 0; i <= n; i++) {
      const bx = x[0] + ((x[1] - x[0]) * i) / n;
      const w = i === 0 || i === n ? 0.05 : 0.022;
      box("black", [bx - w / 2, bx + w / 2], [y0, y0 + h - 0.05], [z - w / 2, z + w / 2]);
    }
  };
  /** Black bar railing along z, on the line x = `x`. */
  const railingZ = (z: Range, y0: number, x: number, h = RAIL_H) => {
    box("black", [x - 0.025, x + 0.025], [y0 + h - 0.05, y0 + h], z);
    box("black", [x - 0.018, x + 0.018], [y0 + 0.08, y0 + 0.12], z);
    const n = Math.max(1, Math.round((z[1] - z[0]) / BAR_STEP));
    for (let i = 1; i < n; i++) {
      const bz = z[0] + ((z[1] - z[0]) * i) / n;
      box("black", [x - 0.011, x + 0.011], [y0, y0 + h - 0.05], [bz - 0.011, bz + 0.011]);
    }
  };
  /** Balcony railing: front along x at `zEdge`, side returns back to the wall at `zWall`. */
  const balconyRailing = (x: Range, y0: number, zWall: number, zEdge: number) => {
    const s = Math.sign(zEdge - zWall);
    const zr = zEdge - s * 0.04;
    railingX(x, y0, zr);
    const back = sorted(zWall + s * 0.05, zr);
    railingZ(back, y0, x[0] + 0.025);
    railingZ(back, y0, x[1] - 0.025);
  };

  /** Dark aluminium window on a wall at `zWall`, facing `s` (+1 street, −1 rear). */
  const window_ = (
    x: Range,
    y0: number,
    h: number,
    panes: number[],
    transoms: number[],
    zWall: number,
    s: number,
    paneMaterial: (i: number) => ArchMaterial,
  ) => {
    const zFrame = sorted(zWall, zWall + s * 0.07);
    const zGlass = sorted(zWall + s * 0.025, zWall + s * 0.035);
    const f = 0.06;
    box("black", x, [y0, y0 + f], zFrame);
    box("black", x, [y0 + h - f, y0 + h], zFrame);
    box("black", [x[0], x[0] + f], [y0, y0 + h], zFrame);
    box("black", [x[1] - f, x[1]], [y0, y0 + h], zFrame);
    let cx = x[0];
    panes.forEach((p, i) => {
      const w = (x[1] - x[0]) * p;
      box(paneMaterial(i), [cx + 0.01, cx + w - 0.01], [y0 + f, y0 + h - f], zGlass);
      if (transoms.includes(i)) box("black", [cx, cx + w], [y0 + 0.93, y0 + 0.98], zFrame);
      if (i < panes.length - 1) box("black", [cx + w - 0.025, cx + w + 0.025], [y0, y0 + h], zFrame);
      cx += w;
    });
  };

  /** Rounded shrub: three overlapping blobs. */
  const shrub = (c: V3, r: number, seed: number) => {
    blob("green", c, r);
    blob("greenDark", [c[0] + r * 0.55, c[1] - r * 0.1, c[2] - r * 0.25], r * 0.75);
    blob(rand(seed) > 0.5 ? "green" : "greenDark", [c[0] - r * 0.55, c[1] - r * 0.15, c[2] + r * 0.2], r * 0.7);
  };
  /** Trailing plant strands hanging from a point. */
  const hanging = (x: number, yTop: number, z: number, seed: number, count = 3, maxLen = 0.7) => {
    for (let i = 0; i < count; i++) {
      const len = 0.25 + rand(seed + i) * maxLen;
      const dx = (i - (count - 1) / 2) * 0.07;
      box(i % 2 ? "greenDark" : "green", [x + dx - 0.025, x + dx + 0.025], [yTop - len, yTop], [z - 0.02, z + 0.02]);
    }
  };
  /** Tall-leaved plant (entrance planters): blades fanning out of the soil. */
  const leafyPlant = (x: number, y: number, z: number, h: number, seed: number) => {
    const count = 9;
    for (let k = 0; k < count; k++) {
      const a = (k / count) * Math.PI * 2;
      const tilt = 0.2 + rand(seed + k) * 0.35;
      const len = h * (0.7 + rand(seed + k * 2) * 0.3);
      obox(
        k % 2 ? "green" : "greenDark",
        [x + Math.cos(a) * Math.sin(tilt) * len * 0.5, y + Math.cos(tilt) * len * 0.5, z - Math.sin(a) * Math.sin(tilt) * len * 0.5],
        [0.02, len, 0.12],
        [0, a, -tilt],
      );
    }
  };
  /** Palm in a dark planter (rooftop corners): trunk and nine drooping fronds. */
  const palm = (x: number, z: number, y: number, seed: number) => {
    box("planter", [x - 0.38, x + 0.38], [y, y + 0.6], [z - 0.34, z + 0.34]);
    const top = y + 1.9;
    cyl("trunk", x, z, [y + 0.5, top], 0.07);
    const count = 9;
    for (let k = 0; k < count; k++) {
      const a = (k / count) * Math.PI * 2 + rand(seed) * 0.6;
      const droop = 0.35 + rand(seed + k) * 0.35;
      const len = 1.15 + rand(seed + k * 3) * 0.35;
      const r = (len / 2) * Math.cos(droop);
      obox(
        k % 2 ? "green" : "greenDark",
        [x + Math.cos(a) * r, top - (len / 2) * Math.sin(droop), z - Math.sin(a) * r],
        [len, 0.025, 0.3],
        [0, a, -droop],
      );
    }
  };

  /** Street panes: white sheer curtains behind some of them, as in the render. */
  const streetPane = (floor: number, win: number) => (i: number): ArchMaterial => {
    const base = win === 1 ? i === 1 : i === 0;
    const flip = rand(floor * 17 + win * 5 + i) > 0.78;
    return base !== flip ? "curtain" : "glass";
  };

  // --- Ground floor: garage, raised hall, entrance portico ------------------------------
  level = 0;
  const gTop = G - S;
  const gateZ: Range = [zf - 0.66, zf - 0.58];

  // Party walls and rear wall (blind, not in the brochure beyond being party walls).
  box("wall", [-hw, -hw + 0.2], [0, gTop], [-hd, gateZ[0]]);
  box("wall", [hw - 0.2, hw], [0, gTop], [-hd, gateZ[0]]);
  box("wall", [-hw, hw], [0, gTop], [-hd, -hd + 0.2]);
  // Garage behind the gates: dark floor, ceiling and back.
  box("dark", [-hw + 0.2, hw - 0.2], [0, 0.03], [-hd + 0.2, gateZ[0]]);
  box("dark", [-hw + 0.2, hw - 0.2], [gTop - 0.04, gTop], [-hd + 0.2, zf]);
  box("dark", [-hw + 0.2, hw - 0.2], [0, gTop], [-hd + 0.2, -hd + 0.3]);
  // White edge pilasters (both lot lines, full height).
  for (const x of [[-hw, -hw + 0.3], [hw - 0.3, hw]] as Range[]) box("white", x, [0, gTop], [zf - 0.05, zf + 0.12]);
  // Low white pier left of the side access.
  box("white", [-hw, -4.84], [0, 2.3], [gateZ[0] - 0.1, zf + 0.12]);

  // Black slatted gates: lateral access (left) and garage (right).
  for (const x of [[-4.84, -2.35], [1.52, 4.95]] as Range[]) {
    box("black", x, [2.5, 2.95], gateZ);
    box("black", x, [0, 0.06], gateZ);
    box("black", [x[0], x[0] + 0.08], [0, 2.5], gateZ);
    box("black", [x[1] - 0.08, x[1]], [0, 2.5], gateZ);
    const n = Math.round((x[1] - x[0]) / 0.1);
    for (let i = 1; i < n; i++) {
      const bx = x[0] + ((x[1] - x[0]) * i) / n;
      box("black", [bx - 0.02, bx + 0.02], [0.06, 2.5], [gateZ[0] + 0.01, gateZ[1] - 0.01]);
    }
  }
  // White vertical boards on the garage side walls, seen above the gates.
  for (const x of [[-4.95, -3.6], [3.5, 4.95]] as Range[]) {
    box("white", x, [2.95, gTop - 0.04], [gateZ[0] - 0.12, gateZ[0] - 0.06]);
    for (let bx = x[0] + 0.06; bx < x[1]; bx += 0.16) {
      box("white", [bx, bx + 0.05], [2.95, gTop - 0.04], [gateZ[0] - 0.06, gateZ[0] - 0.02]);
    }
  }

  // Raised entrance hall: landing, glazed front, warm interior, round columns.
  const hallFront = zf - 3.3;
  box("white", [-2.3, 0.76], [0, HALL_FLOOR], [hallFront, zf - 0.9]);
  box("hall", [-1.9, 1.1], [HALL_FLOOR, gTop - 0.05], [zf - 9, hallFront - 0.05]);
  box("hallGlass", [-1.75, 1.05], [HALL_FLOOR, gTop - 0.04], [hallFront - 0.02, hallFront]);
  for (const x of [-1.75, -0.82, 0.11, 1.05]) box("black", [x - 0.03, x + 0.03], [HALL_FLOOR, gTop - 0.04], [hallFront - 0.03, hallFront + 0.03]);
  box("black", [-1.75, 1.05], [2.88, 2.94], [hallFront - 0.03, hallFront + 0.03]);
  box("black", [-1.75, 1.05], [HALL_FLOOR, HALL_FLOOR + 0.05], [hallFront - 0.03, hallFront + 0.03]);
  cyl("white", -1.98, hallFront + 0.25, [0, gTop], 0.2);
  cyl("white", 1.3, hallFront + 0.25, [0, gTop], 0.2);

  // Four steps from the sidewalk up to the landing.
  for (let k = 0; k < 4; k++) {
    box("white", [-2.2, 0.16], [0, STEP_RISE * (k + 1)], [zf - 0.95, zf + 0.3 - STEP_RUN * k]);
  }
  // White portico: beam over the steps and the garage gate, thin leg on the left.
  box("white", [-2.3, hw], [2.9, 3.55], [zf - 0.9, zf + 0.35]);
  box("white", [-2.32, -2.17], [0, 2.9], [zf + 0.2, zf + 0.35]);
  box("white", [hw - 0.3, hw], [0, 2.9], [gateZ[0], zf + 0.35]);
  // Planters: one on the landing, a tall one beside the steps.
  box("white", [-2.15, -1.55], [HALL_FLOOR, HALL_FLOOR + 0.42], [zf - 1.7, zf - 1.1]);
  leafyPlant(-1.85, HALL_FLOOR + 0.42, zf - 1.4, 1.0, 11);
  box("white", [0.16, 0.74], [0, 1.0], [zf - 0.35, zf + 0.3]);
  leafyPlant(0.45, 1.0, zf - 0.02, 1.2, 17);
  // Pier with the street number (the digits are drawn by the scene).
  box("white", [0.76, 1.48], [0, 2.4], [zf - 0.3, zf + 0.3]);

  // --- Residential floors -----------------------------------------------------------------
  for (let f = 1; f <= floors; f++) {
    level = f;
    const y0 = floorBaseY(f, config);
    const kind = frameKind(f);

    // Floor slab (white edge line between the frames, flush with the party walls).
    box("white", [-hw, hw], [y0 - S, y0], [-hd, hd]);
    // Stair and lift core; on floor 1 the common quincho takes the rear right.
    box("wall", [-hw, hw], [y0, y0 + clear], core.z);
    if (f === 1) {
      const q = zoneExtents("quincho", config);
      box("wall", q.x, [y0, y0 + clear], q.z);
    }
    // Edge pilasters.
    for (const x of [[-hw, -hw + 0.3], [hw - 0.3, hw]] as Range[]) {
      box("white", x, [y0 - S, y0 + clear], [zf - 0.05, zf + 0.12]);
    }

    // Grey frame box: bottom band (balcony slab), top band, two sides.
    const [fx0, fx1] = FRAME_X[kind];
    const fz: Range = [zf, zf + FRAME_DEPTH];
    box("frame", [fx0, fx1], [y0 - 0.25, y0], fz);
    box("frame", [fx0, fx1], [y0 + clear - FRAME_BAND, y0 + clear], fz);
    box("frame", [fx0, fx0 + FRAME_SIDE], [y0, y0 + clear - FRAME_BAND], fz);
    box("frame", [fx1 - FRAME_SIDE, fx1], [y0, y0 + clear - FRAME_BAND], fz);

    // The three window bays.
    STREET_WINDOWS.forEach((w, wi) =>
      window_(w.x, y0, w.height, w.panes, w.transom, zf, 1, streetPane(f, wi)),
    );

    // Balconies: inside the frame they stand on its bottom band; outside it, on a white slab.
    streetRailings(f).forEach((r, ri) => {
      if (!r.framed) box("white", [r.x[0] - 0.05, r.x[1] + 0.05], [y0 - 0.2, y0], [zf, zf + FRAME_DEPTH]);
      balconyRailing(r.x, y0, zf, zf + FRAME_DEPTH);
      // Hanging planter on the rail, as in most balconies of the render.
      const px = ri % 2 === f % 2 ? r.x[0] + 0.45 : r.x[1] - 0.45;
      box("planter", [px - 0.28, px + 0.28], [y0 + RAIL_H - 0.2, y0 + RAIL_H + 0.02], [zf + FRAME_DEPTH - 0.2, zf + FRAME_DEPTH - 0.04]);
      shrub([px, y0 + RAIL_H + 0.12, zf + FRAME_DEPTH - 0.12], 0.17, f * 7 + ri);
      hanging(px, y0 + RAIL_H - 0.18, zf + FRAME_DEPTH + 0.0, f * 13 + ri, 3, 0.6);
    });

    // Slatted grille at the top of the unframed left bay (floors 1, 3, 5).
    if (kind === "right") {
      const gy: Range = [y0 + clear - 0.34, y0 + clear - 0.04];
      box("dark", [-4.95, -3.75], gy, [zf, zf + 0.02]);
      for (let bx = -4.93; bx < -3.75; bx += 0.08) box("white", [bx, bx + 0.035], gy, [zf + 0.02, zf + 0.05]);
    }

    // Rear facade (not in the brochure's renders: windows and the rear units' balcony from
    // the floor plans, sizes estimated).
    const zr = -hd;
    const rearPane = (i: number): ArchMaterial => (rand(f * 23 + i) > 0.6 ? "curtain" : "glass");
    if (f === 1) {
      window_([-4.2, -1.6], y0 + 0.9, 1.4, [0.5, 0.5], [], zr, -1, rearPane);
      window_([0.9, 4.3], y0, 2.3, [0.33, 0.34, 0.33], [], zr, -1, rearPane);
    } else {
      window_([-4.4, -1.6], y0, 2.3, [0.34, 0.33, 0.33], [], zr, -1, rearPane);
      window_([0.6, 3.4], y0, 2.3, [0.34, 0.33, 0.33], [], zr, -1, rearPane);
      box("white", [-3.6, 3.6], [y0 - 0.2, y0], [zr - FRAME_DEPTH, zr]);
      balconyRailing([-3.6, 3.6], y0, zr, zr - FRAME_DEPTH);
    }
  }

  // --- Roof terrace: grey frame, black pergola, railing, plants, stair/lift block ------------
  level = floors + 1;
  const y = roofY;
  const back = zf - 6.6;
  box("white", [-hw, hw], [y - S, y], [-hd, hd]);
  box("deck", [-hw + 0.25, hw - 0.25], [y, y + 0.04], [back, zf - 0.25]);
  // Plain parapets around the rest of the roof (not visible in the brochure).
  box("white", [-hw, hw], [y, y + 1.0], [-hd, -hd + 0.2]);
  box("white", [-hw, -hw + 0.2], [y, y + 1.0], [-hd, back]);
  box("white", [hw - 0.2, hw], [y, y + 1.0], [-hd, back]);
  // Light grey stair and lift block, behind the pergola.
  box("block", [-1.7, 1.4], [y, y + 3.0], core.z);
  box("white", [-1.8, 1.5], [y + 3.0, y + 3.1], [core.z[0] - 0.1, core.z[1] + 0.1]);

  // Grey frame: four posts and a ring beam, 2.4 m high, 6.6 m deep.
  const frameTop: Range = [y + 2.17, y + 2.4];
  const postZ: Range[] = [[zf - 0.22, zf], [back, back + 0.22]];
  for (const px of [[-hw + 0.03, -hw + 0.25], [hw - 0.25, hw - 0.03]] as Range[]) {
    for (const pz of postZ) box("frame", px, [y, frameTop[0]], pz);
    box("frame", px, frameTop, [back, zf]);
  }
  for (const pz of postZ) box("frame", [-hw + 0.03, hw - 0.03], frameTop, pz);
  // Black pergola: inner beams and slats running front to back.
  for (const bz of [[zf - 0.32, zf - 0.22], [back + 0.22, back + 0.32]] as Range[]) {
    box("black", [-hw + 0.25, hw - 0.25], [y + 2.02, y + 2.17], bz);
  }
  for (let i = 0; i <= 20; i++) {
    const sx = -4.8 + i * 0.48;
    box("black", [sx - 0.03, sx + 0.03], [y + 2.0, y + 2.15], [back + 0.22, zf - 0.22]);
    // Climbing plant hanging from the slats, denser toward the front.
    for (let j = 0; j < 3; j++) {
      if (rand(i * 11 + j) < 0.35) continue;
      const hz = zf - 0.5 - j * 1.6 - rand(i + j * 5) * 0.8;
      hanging(sx, y + 2.0, hz, i * 31 + j, 2, j === 0 ? 1.1 : 0.7);
    }
  }
  // Railing: front set back behind the frame, sides along the terrace.
  railingX([-hw + 0.3, hw - 0.3], y, zf - 0.4);
  railingZ([back + 0.25, zf - 0.4], y, -hw + 0.3);
  railingZ([back + 0.25, zf - 0.4], y, hw - 0.3);
  // Palms in the front corners, planters with shrubs along the railing.
  palm(-4.5, zf - 1.0, y, 3);
  palm(4.5, zf - 1.0, y, 7);
  for (const [px, seed] of [[-3.3, 1], [-2.3, 2], [2.4, 4], [3.4, 5]] as [number, number][]) {
    box("planter", [px - 0.4, px + 0.4], [y, y + 0.45], [zf - 1.0, zf - 0.6]);
    shrub([px, y + 0.62, zf - 0.8], 0.28, seed);
  }

  return parts;
}

/** Where the street number is painted on its pier: center and size of the plate. */
export const STREET_NUMBER_PLATE = {
  center: [1.12, 1.25] as [number, number],
  size: [0.5, 1.8] as [number, number],
  z: CATALUNA_CONFIG.buildingDepth / 2 + 0.302,
  // Left blank: the street number is not shown.
  text: "",
};
