import * as THREE from "three";
import type { GeoSite } from "@/lib/geo/site";
import { ANCHO, PLANTAS, PROFUNDIDAD } from "./casa-citra";

/**
 * Casa Citra in 3D: the architect's SketchUp model (the three-level copy, 12.25 × 6.70 m like
 * the plans), converted to GLB. In that copy the windows and the stairs sit beside the house,
 * so the glass, the railings and the stairs are added here, on the model's real openings.
 *
 * Plan coordinates are meters from the top-left corner of the sheets. On the sheets north
 * points left, so: plan left = north, up = east, right = south, down = west.
 * Scene: the house centered at the origin, +X = plan right (south), +Z = plan down (west),
 * +Y up.
 */

/** The address on the page is made up, like Torre Aldrey's name: the real lot stays private. */
export const DIRECCION_FICTICIA = "Paseo de los Pinos 1240, Villa Gesell";

/**
 * Real lot, for the sun and the satellite backdrop; never written on the page. The client gave
 * a Street View point on the street (-37.0768544, -56.8356954, looking 173°); the house is
 * placed 20 m along that view, ~17 m back from the street centerline, the north facade (the
 * loggia) toward the street. Scene +Z is west (north is −X on the sheets), so the bearing is 270°.
 * Map labels stay off (see MapGround): the real street names would give the lot away.
 */
export const SITIO_GEO: GeoSite = {
  lat: -37.0770328,
  lon: -56.8356689,
  facadeBearing: 270,
  addressOffset: new THREE.Vector3(0, 0, 0),
  region: "Villa Gesell",
  address: DIRECCION_FICTICIA,
};

export const SITIO_SOL = { lat: SITIO_GEO.lat, lon: SITIO_GEO.lon };

/** Streets around the lot (OpenStreetMap), meters east / north of SITIO_GEO. */
export const CALLES_URL = "/geo/streets/casa-citra.json";

/**
 * The GLB and how it sits in the scene: its long side (file Z) becomes the plan's x, and its
 * finished ground floor (0.15 m above the base plate) lands on y = 0.
 */
export const MODELO = {
  url: "/projects/casa-citra/modelo.glb",
  position: [0.525, -0.15, 0.592] as [number, number, number],
  rotationY: Math.PI / 2,
};

/** Wall thickness used to seat the glass inside the openings. */
export const MURO = 0.2;
/** Glass railing of the 1st floor loggia. */
export const BARANDA = 1.05;

export type Nivel = { id: string; nombre: string; base: number };

/** Finished floor of each level in the model, in meters. */
const BASES = [0, 2.45, 5.35];

export const NIVELES: Nivel[] = PLANTAS.map((p, i) => ({
  id: p.id,
  nombre: p.nombre,
  base: BASES[i],
}));

/** Top of the model's roof parapet. */
export const ALTURA_TOTAL = 7.95;

/** Plan → scene. */
export function planAEscena(x: number, y: number): [number, number] {
  return [x - ANCHO / 2, y - PROFUNDIDAD / 2];
}

/** A hole in a facade: along the wall from `desde` to `hasta` (plan meters), heights from the level's floor. */
export type Abertura = {
  desde: number;
  hasta: number;
  piso: number;
  techo: number;
  /** Glass fills it (a window); without, it is open (a loggia, the terrace). */
  vidrio?: boolean;
  /** Glass railing across the bottom (open loggias). */
  baranda?: boolean;
};

export type Fachada = "norte" | "sur" | "este" | "oeste";

/**
 * Openings of the upper levels, measured on the model's facades. North and south are the short
 * sides (along plan y); east and west the long ones (along plan x).
 */
export const ABERTURAS: Record<string, Record<Fachada, Abertura[]>> = {
  "primer-piso": {
    // Loggia of the 1st floor terrace, open to the north.
    norte: [{ desde: 1.4, hasta: 6.44, piso: 0, techo: 2.58, baranda: true }],
    sur: [
      { desde: 0.26, hasta: 0.54, piso: 0, techo: 2.0, vidrio: true },
      { desde: 2.46, hasta: 2.74, piso: 0, techo: 2.0, vidrio: true },
    ],
    este: [{ desde: 7.52, hasta: 8.6, piso: 0.92, techo: 2.0, vidrio: true }],
    oeste: [{ desde: 3.26, hasta: 11.52, piso: 0.92, techo: 2.0, vidrio: true }],
  },
  terraza: {
    // The terrace looks out through open bands over its parapet.
    norte: [{ desde: 1.4, hasta: 6.7, piso: 0.9, techo: 1.98 }],
    sur: [
      { desde: 0.26, hasta: 0.54, piso: 0, techo: 1.98, vidrio: true },
      { desde: 4.96, hasta: 6.44, piso: 0.9, techo: 1.98, vidrio: true },
    ],
    este: [{ desde: 7.52, hasta: 7.8, piso: 0, techo: 1.98, vidrio: true }],
    // Open along the mirador, glazed along the quincho.
    oeste: [
      { desde: 0, hasta: 7.45, piso: 0.9, techo: 1.98 },
      { desde: 7.45, hasta: 11.52, piso: 0.9, techo: 1.98, vidrio: true },
    ],
  },
};

/** Where the camera starts and how far it may go. */
export const VISTA_INICIAL = {
  position: [-19, 9.5, 17] as [number, number, number],
  target: [0, 3.6, 0] as [number, number, number],
};
