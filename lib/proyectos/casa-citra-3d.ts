import { ALTURA_PISO, ANCHO, PLANTAS, PROFUNDIDAD } from "./casa-citra";

/**
 * Casa Citra in 3D: the house rebuilt from the architect's plans (lib/proyectos/casa-citra.ts)
 * as a white study model. There is no section, so every level is ALTURA_PISO (2.80 m) floor
 * to floor, a standard height chosen with the client.
 *
 * Plan coordinates are meters from the top-left corner of the sheets. On the sheets north
 * points left, so: plan left = north, up = east, right = south, down = west.
 * Scene: the house centered at the origin, +X = plan right (south), +Z = plan down (west),
 * +Y up.
 */

/** Real lot, used only to aim the sun. It is never shown: the page shows DIRECCION_FICTICIA. */
export const SITIO_SOL = { lat: -37.0768544, lon: -56.8356954 };

/** The address on the page is made up, like Torre Aldrey's name: the real lot stays private. */
export const DIRECCION_FICTICIA = "Paseo de los Pinos 1240, Villa Gesell";

export const LOSA = 0.25;
export const MURO = 0.2;
/** Parapets of the roof terrace and railings. */
export const BARANDA = 1.05;

export type Nivel = { id: string; nombre: string; base: number };

export const NIVELES: Nivel[] = PLANTAS.map((p, i) => ({
  id: p.id,
  nombre: p.nombre,
  base: i * ALTURA_PISO,
}));

/** Top of the white box: the roof terrace's walls rise a full storey, like a frame. */
export const ALTURA_TOTAL = NIVELES.length * ALTURA_PISO;

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
 * Openings of the white box, read from the plans and the renders. North and south are the
 * short sides (along plan y); east and west the long ones (along plan x). The renders don't
 * agree with each other on every window, so these follow the plans: the loggias and terraces
 * where the plans show them, windows where a room needs one.
 */
export const ABERTURAS: Record<string, Record<Fachada, Abertura[]>> = {
  "primer-piso": {
    // Loggia of the 1st floor terrace, open to the north.
    norte: [{ desde: 1.4, hasta: 6.45, piso: 0, techo: 2.35, baranda: true }],
    sur: [
      { desde: 3.4, hasta: 3.7, piso: 0.3, techo: 2.4, vidrio: true },
      { desde: 5.0, hasta: 5.3, piso: 0.3, techo: 2.4, vidrio: true },
    ],
    // Street side: stair and toilette.
    este: [
      { desde: 6.6, hasta: 8.2, piso: 1.0, techo: 2.2, vidrio: true },
      { desde: 10.5, hasta: 11.6, piso: 1.5, techo: 2.2, vidrio: true },
    ],
    // Garden side: living, kitchen and suite.
    oeste: [
      { desde: 2.2, hasta: 6.1, piso: 0.9, techo: 2.3, vidrio: true },
      { desde: 6.7, hasta: 8.1, piso: 0.9, techo: 2.3, vidrio: true },
      { desde: 9.6, hasta: 11.7, piso: 0.9, techo: 2.3, vidrio: true },
    ],
  },
  terraza: {
    norte: [{ desde: 1.4, hasta: 6.45, piso: 0, techo: 2.35, baranda: true }],
    sur: [{ desde: 2.2, hasta: 4.6, piso: 0.9, techo: 2.2, vidrio: true }],
    este: [
      { desde: 0.6, hasta: 2.8, piso: 1.0, techo: 2.35 },
      { desde: 10.3, hasta: 11.6, piso: 1.5, techo: 2.2, vidrio: true },
    ],
    // The mirador opens to the west over the pines; the quincho has a window band.
    oeste: [
      { desde: 0.6, hasta: 7.3, piso: 0, techo: 2.35, baranda: true },
      { desde: 8.2, hasta: 11.6, piso: 0.9, techo: 2.3, vidrio: true },
    ],
  },
};

/** Roof slabs over the terrace level, plan [x, y, w, h]: the quincho and the mirador's eave. */
export const TECHOS: [number, number, number, number][] = [
  [7.45, 0, ANCHO - 7.45, PROFUNDIDAD],
  [1.1, 1.3, 5.3, 4.7],
];

/** Where the camera starts and how far it may go. */
export const VISTA_INICIAL = {
  position: [-19, 9.5, 17] as [number, number, number],
  target: [0, 3.6, 0] as [number, number, number],
};
