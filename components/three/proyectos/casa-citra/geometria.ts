import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { ANCHO, PROFUNDIDAD, type Ambiente } from "@/lib/proyectos/casa-citra";
import type { Abertura, Fachada } from "@/lib/proyectos/casa-citra-3d";

/**
 * Geometry helpers for the Casa Citra model. Everything is built in plan meters (x right,
 * y down on the sheets) and placed in the scene with the house centered at the origin:
 * scene X = plan x − W/2, scene Z = plan y − D/2.
 */

export const OFFSET_X = -ANCHO / 2;
export const OFFSET_Z = -PROFUNDIDAD / 2;

const svg = new SVGLoader();

/** A room outline (rectangle or SVG path with arcs) as a THREE.Shape in plan coordinates. */
export function formaDeAmbiente(a: Ambiente): THREE.Shape {
  if ("rect" in a.forma) {
    const [x, y, w, h] = a.forma.rect;
    const s = new THREE.Shape();
    s.moveTo(x, y).lineTo(x + w, y).lineTo(x + w, y + h).lineTo(x, y + h).closePath();
    return s;
  }
  return formaDePath(a.forma.path);
}

export function formaDePath(d: string): THREE.Shape {
  const data = svg.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`);
  const shapes = SVGLoader.createShapes(data.paths[0]);
  return shapes[0];
}

/**
 * A flat plan shape as a slab: top face at `top`, `thickness` thick, in scene coordinates.
 * Plan y maps to scene +Z (a rotation, so normals stay right).
 */
export function losa(shape: THREE.Shape, top: number, thickness: number) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 24 });
  g.rotateX(Math.PI / 2); // (x, y, z) → (x, −z, y): plan y → +Z, extrusion → −Y
  g.translate(OFFSET_X, top, OFFSET_Z);
  return g;
}

/** A wall from plan point a to b, `height` tall from `base`, as a box in scene coordinates. */
export function muroEntre(
  a: THREE.Vector2,
  b: THREE.Vector2,
  base: number,
  height: number,
  thickness: number
): THREE.BufferGeometry | null {
  const len = a.distanceTo(b);
  if (len < 0.02) return null;
  const g = new THREE.BoxGeometry(len, height, thickness);
  g.rotateY(-Math.atan2(b.y - a.y, b.x - a.x));
  g.translate((a.x + b.x) / 2 + OFFSET_X, base + height / 2, (a.y + b.y) / 2 + OFFSET_Z);
  return g;
}

/** Where a facade runs on the plan: its start and its direction along. */
function lineaDeFachada(f: Fachada, grosor: number) {
  const m = grosor / 2;
  switch (f) {
    case "norte":
      return { origen: new THREE.Vector2(m, 0), dir: new THREE.Vector2(0, 1) };
    case "sur":
      return { origen: new THREE.Vector2(ANCHO - m, 0), dir: new THREE.Vector2(0, 1) };
    case "este":
      return { origen: new THREE.Vector2(0, m), dir: new THREE.Vector2(1, 0) };
    case "oeste":
      return { origen: new THREE.Vector2(0, PROFUNDIDAD - m), dir: new THREE.Vector2(1, 0) };
  }
}

export type Cierres = {
  vidrios: THREE.BufferGeometry[];
  barandas: THREE.BufferGeometry[];
};

/** What fills one facade's openings: glass in the windows, glass railings across the loggias. */
export function cierres(
  f: Fachada,
  base: number,
  grosor: number,
  aberturas: Abertura[],
  barandaAltura: number
): Cierres {
  const { origen, dir } = lineaDeFachada(f, grosor);
  const at = (t: number) => origen.clone().addScaledVector(dir, t);
  const out: Cierres = { vidrios: [], barandas: [] };
  const push = (list: THREE.BufferGeometry[], g: THREE.BufferGeometry | null) => {
    if (g) list.push(g);
  };
  for (const h of aberturas) {
    if (h.vidrio) {
      push(out.vidrios, muroEntre(at(h.desde), at(h.hasta), base + h.piso, h.techo - h.piso, 0.03));
    }
    if (h.baranda) {
      push(out.barandas, muroEntre(at(h.desde), at(h.hasta), base, barandaAltura, 0.03));
    }
  }
  return out;
}

/** Straight-run stair inside plan rect [x, y, w, h], climbing along +x from `base` by `rise`. */
export function escalera(rect: [number, number, number, number], base: number, rise: number) {
  const [x, y, w, h] = rect;
  const steps = 14;
  const out: THREE.BufferGeometry[] = [];
  for (let i = 0; i < steps; i++) {
    const top = base + (rise * (i + 1)) / steps;
    const g = new THREE.BoxGeometry(w / steps, top - base, h * 0.48);
    // One straight flight on the far half of the stairwell (the plans show a dog-leg; at
    // this scale one flight reads the same and stays clear of the landing).
    g.translate(x + (w * (i + 0.5)) / steps + OFFSET_X, base + (top - base) / 2, y + h * 0.74 + OFFSET_Z);
    out.push(g);
  }
  return out;
}
