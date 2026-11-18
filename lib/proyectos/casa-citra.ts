/**
 * Casa Citra: a single-family house by Arq. Diego Vargas (A15Z Studio) in Villa Gesell.
 * Client project page at /proyectos/casa-citra.
 *
 * Plans are schematic, redrawn from the architect's 1:100 plans (sheets 1.1 and 1.2). Room
 * sizes are the dimensions written on those sheets; areas are width × depth of those
 * dimensions, so they are approximate. Coordinates are meters from the top-left corner of the
 * 12.25 × 6.70 m footprint, as drawn on the sheets (north is to the left).
 */

export const CASA_CITRA_SLUG = "casa-citra";

export const CASA_CITRA_PROJECT = {
  slug: CASA_CITRA_SLUG,
  name: "Casa Citra",
  address: "Villa Gesell",
  city: "Buenos Aires, Argentina",
  // Street View point given by the client, next to the lot. Not shown on the page.
  latitude: -37.0768544,
  longitude: -56.8356954,
  description:
    "Vivienda unifamiliar de tres niveles sobre pilotes, en el bosque de Villa Gesell. Proyecto del Arq. Diego Vargas (A15Z Studio).",
  privado: true,
};

export const CASA_CITRA_AUTOR = "Arq. Diego Vargas · A15Z Studio";

const FOTOS = "/projects/casa-citra/fotos";

export type Foto = {
  src: string;
  miniatura: string;
  alt: string;
  titulo: string;
  width: number;
  height: number;
};

function foto(file: string, titulo: string, alt: string, width = 2000, height = 1133): Foto {
  return {
    src: `${FOTOS}/${file}.webp`,
    miniatura: `${FOTOS}/${file}-800.webp`,
    alt,
    titulo,
    width,
    height,
  };
}

/** Every render, in gallery order. The first ones also play in the opening slideshow. */
export const FOTOS_CASA_CITRA: Foto[] = [
  foto("atardecer", "Atardecer", "La casa al atardecer, con la cochera bajo los pilotes", 1672, 941),
  foto("bosque-frente", "Entre los pinos", "Vista desde el sendero del bosque, con la terraza del primer piso"),
  foto("lateral", "Fachada lateral", "Fachada lateral con las ventanas corridas y la planta baja en madera"),
  foto("contrafrente", "Contrafrente", "El volumen blanco sobre la planta baja curva revestida en madera"),
  foto("luz-calida", "Luz de la tarde", "La casa entre árboles con luz cálida de la tarde", 1536, 1024),
  foto("maqueta", "Maqueta", "Maqueta de estudio de la casa, vista desde arriba con la terraza mirador"),
];

/** Short film above the gallery: a drone rise from the path to above the pines. */
export const VIDEO_CASA_CITRA = {
  src: "/projects/casa-citra/video/vuelo.mp4",
  poster: "/projects/casa-citra/video/vuelo-poster.webp",
  width: 1280,
  height: 720,
  titulo: "Vuelo sobre el bosque",
  descripcion: "Del sendero a las copas de los pinos: la casa vista desde el suelo hasta el aire.",
};

/** Renders shown full screen at the top of the page. */
export const PORTADA_CASA_CITRA = FOTOS_CASA_CITRA.slice(0, 4);

// ---- Plans ----

export type Ambiente = {
  id: string;
  nombre: string;
  /** Dimensions as written on the plan, in meters. */
  medidas?: [number, number];
  /** Short note shown in the info card. */
  nota?: string;
  /** Outline in plan meters: a rectangle [x, y, w, h], or an SVG path in the same units. */
  forma: { rect: [number, number, number, number] } | { path: string };
  /** Covered rooms are counted as interior; terraces and the carport are not. */
  exterior?: boolean;
};

export type Planta = {
  id: string;
  nombre: string;
  corto: string;
  /** Outer walls of the level, as an SVG path in plan meters. */
  contorno: string;
  /** Upper floor seen from below, drawn dashed (only the ground floor has one). */
  proyeccion?: string;
  ambientes: Ambiente[];
  /** Stair in plan meters: [x, y, w, h]. */
  escalera: [number, number, number, number];
  /** Column centers. */
  pilotes: [number, number][];
};

export const ANCHO = 12.25;
export const PROFUNDIDAD = 6.7;

const RECTANGULO = `M0 0H${ANCHO}V${PROFUNDIDAD}H0Z`;
const ESCALERA: [number, number, number, number] = [2.95, 0.15, 3.4, 1.2];
const PILOTES: [number, number][] = [0, 3, 6, 9, 12.25].flatMap((x) => [
  [x, 0] as [number, number],
  [x, PROFUNDIDAD] as [number, number],
]);

/** The ground floor is a closed volume with rounded ends, set back from the street side. */
const PB_FONDO = 3.85;
const PB_RADIO = 1.6;
const PB_IZQ = 0.35;
const PB_DER = 11.0;
const VOLUMEN_PB = [
  `M${PB_IZQ + PB_RADIO} 0`,
  `H${PB_DER - PB_RADIO}`,
  `A${PB_RADIO} ${PB_RADIO} 0 0 1 ${PB_DER} ${PB_RADIO}`,
  `V${PB_FONDO - PB_RADIO}`,
  `A${PB_RADIO} ${PB_RADIO} 0 0 1 ${PB_DER - PB_RADIO} ${PB_FONDO}`,
  `H${PB_IZQ + PB_RADIO}`,
  `A${PB_RADIO} ${PB_RADIO} 0 0 1 ${PB_IZQ} ${PB_FONDO - PB_RADIO}`,
  `V${PB_RADIO}`,
  `A${PB_RADIO} ${PB_RADIO} 0 0 1 ${PB_IZQ + PB_RADIO} 0`,
  "Z",
].join(" ");

export const PLANTAS: Planta[] = [
  {
    id: "planta-baja",
    nombre: "Planta baja",
    corto: "PB",
    contorno: VOLUMEN_PB,
    proyeccion: RECTANGULO,
    escalera: ESCALERA,
    pilotes: PILOTES.filter(([, y]) => y > 0),
    ambientes: [
      {
        id: "hall",
        nombre: "Hall de acceso",
        medidas: [1.15, 1.3],
        nota: "Entrada a la casa y arranque de la escalera.",
        forma: {
          path: `M${PB_IZQ + PB_RADIO} 0 H2.95 V1.5 H${PB_IZQ} V${PB_RADIO} A${PB_RADIO} ${PB_RADIO} 0 0 1 ${PB_IZQ + PB_RADIO} 0 Z`,
        },
      },
      {
        id: "estudio",
        nombre: "Estudio",
        medidas: [2.53, 2.55],
        nota: "Espacio de trabajo con mesa para cuatro, junto a la kitchenette.",
        forma: {
          path: `M${PB_IZQ} 1.5 H4.3 V${PB_FONDO} H${PB_IZQ + PB_RADIO} A${PB_RADIO} ${PB_RADIO} 0 0 1 ${PB_IZQ} ${PB_FONDO - PB_RADIO} Z`,
        },
      },
      {
        id: "kitchenette",
        nombre: "Kitchenette",
        nota: "Anafe, pileta y heladera, abierta al estudio.",
        forma: { rect: [4.3, 1.9, 1.45, 1.95] },
      },
      {
        id: "bano-pb",
        nombre: "Baño",
        medidas: [2.07, 1.4],
        nota: "Baño completo de planta baja.",
        forma: { rect: [5.75, 2.2, 1.6, 1.65] },
      },
      {
        id: "dormitorio-pb",
        nombre: "Dormitorio",
        medidas: [3.15, 2.85],
        nota: "Dormitorio con ventana en la fachada curva.",
        forma: {
          path: `M7.35 0 H${PB_DER - PB_RADIO} A${PB_RADIO} ${PB_RADIO} 0 0 1 ${PB_DER} ${PB_RADIO} V${PB_FONDO - PB_RADIO} A${PB_RADIO} ${PB_RADIO} 0 0 1 ${PB_DER - PB_RADIO} ${PB_FONDO} H7.35 Z`,
        },
      },
      {
        id: "cochera",
        nombre: "Cochera semicubierta",
        nota: "Bajo los pilotes y el primer piso en voladizo.",
        exterior: true,
        forma: { rect: [0, PB_FONDO + 0.15, ANCHO, PROFUNDIDAD - PB_FONDO - 0.15] },
      },
    ],
  },
  {
    id: "primer-piso",
    nombre: "Primer piso",
    corto: "1º",
    contorno: RECTANGULO,
    escalera: ESCALERA,
    pilotes: PILOTES,
    ambientes: [
      {
        id: "terraza-1p",
        nombre: "Terraza",
        medidas: [1.5, 5.4],
        nota: "Terraza cubierta al norte, abierta al estar.",
        exterior: true,
        forma: { rect: [0.15, 1.35, 1.65, 5.2] },
      },
      {
        id: "estar-comedor",
        nombre: "Estar y comedor",
        medidas: [4.45, 5.06],
        nota: "Un solo ambiente abierto a la terraza y a la cocina.",
        forma: { path: "M1.95 0.15 H2.95 V1.35 H6.35 V6.55 H1.95 Z" },
      },
      {
        id: "cocina",
        nombre: "Cocina",
        medidas: [2.45, 3.6],
        nota: "Cocina integrada con isla y desayunador.",
        forma: { rect: [6.35, 2.15, 2.0, 4.4] },
      },
      {
        id: "circulacion-1p",
        nombre: "Circulación",
        nota: "Palier de la escalera, con muro curvo hacia la cocina.",
        forma: { path: "M6.35 0.15 H10.15 V1.35 H9.2 V2.85 H8.35 V2.15 H6.35 Z" },
      },
      {
        id: "toilette-1p",
        nombre: "Toilette",
        medidas: [2.0, 0.9],
        forma: { rect: [10.15, 0.15, 1.95, 1.2] },
      },
      {
        id: "bano-suite",
        nombre: "Baño en suite",
        medidas: [2.0, 1.5],
        nota: "Baño privado del dormitorio principal.",
        forma: { rect: [10.15, 1.35, 1.95, 1.5] },
      },
      {
        id: "suite",
        nombre: "Dormitorio en suite",
        medidas: [3.0, 3.0],
        nota: "Dormitorio principal con baño propio.",
        forma: { rect: [9.2, 2.85, 2.9, 3.7] },
      },
    ],
  },
  {
    id: "terraza",
    nombre: "Terraza",
    corto: "T",
    contorno: RECTANGULO,
    escalera: ESCALERA,
    pilotes: PILOTES,
    ambientes: [
      {
        id: "mirador",
        nombre: "Terraza mirador",
        medidas: [5.31, 5.05],
        nota: "Terraza abierta sobre las copas de los pinos, con alero.",
        exterior: true,
        forma: { rect: [0.15, 1.35, 7.4, 5.2] },
      },
      {
        id: "cantero",
        nombre: "Cantero",
        medidas: [2.75, 1.05],
        exterior: true,
        forma: { rect: [0.15, 0.15, 2.8, 1.2] },
      },
      {
        id: "quincho",
        nombre: "Quincho",
        medidas: [3.39, 5.2],
        nota: "Quincho cerrado con mesa para diez y parrilla.",
        forma: { rect: [7.55, 1.35, 4.55, 5.2] },
      },
      {
        id: "circulacion-t",
        nombre: "Circulación",
        forma: { rect: [7.55, 0.15, 2.4, 1.2] },
      },
      {
        id: "toilette-t",
        nombre: "Toilette",
        medidas: [1.8, 0.9],
        forma: { rect: [9.95, 0.15, 2.15, 1.2] },
      },
    ],
  },
];

export function superficie(a: Ambiente): number | null {
  return a.medidas ? a.medidas[0] * a.medidas[1] : null;
}

/** Key figures for the summary row. */
export const DATOS_CASA_CITRA = [
  { valor: "3", etiqueta: "Niveles" },
  { valor: "2", etiqueta: "Dormitorios" },
  { valor: "2 + 2", etiqueta: "Baños y toilettes" },
  { valor: "12,25 × 6,70", etiqueta: "Metros de planta" },
];

export const PLANOS_PDF = [
  { href: "/projects/casa-citra/planos/casa-citra-plantas.pdf", nombre: "Planta baja y primer piso" },
  { href: "/projects/casa-citra/planos/casa-citra-terraza.pdf", nombre: "Terraza" },
];
