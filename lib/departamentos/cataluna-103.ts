/**
 * Unidad 103 of Cataluña II (Buenos Aires 2771, Mar del Plata), taken from the developer's
 * sales brochure (CATALUÑA 25.10.25.pdf): the floor plan on page 16, the room renders and
 * the building's features.
 *
 * Geometry is in meters, traced from the plan at its own scale (138 px/m; 5.15 × 7.5 m
 * matches the 38.7 m² interior). Axes: x runs left → right on the plan, z runs from the
 * entrance (top of the plan, z = 0) to the street facade (z ≈ 8.66). Heights are not on
 * the plan: 2.60 m floor to ceiling is assumed.
 */

export type Range = [number, number];

/** An axis-aligned block: x and z on the plan, y up from the floor. */
export type Block = { x: Range; z: Range; y?: Range };

export type RoomId = "entrada" | "cocina" | "comedor" | "estar" | "dormitorio" | "bano" | "balcon";

export type Foto = { src: string; alt: string };

export type Room = {
  id: RoomId;
  nombre: string;
  /** Floor outline, [x, z] points, clockwise. */
  piso: [number, number][];
  medidas: string;
  descripcion: string;
  fotos: Foto[];
};

export type Mueble = {
  kind: "box" | "round";
  block: Block;
  color: string;
  /** For "round": diameter is taken from the x range. */
};

export const CEILING = 2.6;

const FOTOS = "/projects/cataluna-ii/fotos";

export const UNIDAD = {
  codigo: "103",
  tipo: "Monoambiente",
  piso: 1,
  posicion: "03",
  frente: "Calle Buenos Aires",
  superficieInterior: 38.7,
  superficieBalcon: 3.4,
  plano: "/projects/cataluna-ii/plano-103.webp",
};

export const PROYECTO = {
  nombre: "Cataluña II",
  desarrollador: "Cataluña Desarrollos Inmobiliarios",
  direccion: "Buenos Aires 2771, Mar del Plata",
  resumen:
    "A 800 m del mar. 15 unidades funcionales de 1, 2 y 3 ambientes, con quincho, terraza con solárium, parrilla y huerta comunitaria.",
  pisos: 7,
  caracteristicas: [
    "Losa radiante",
    "Porcelanato rectificado",
    "Aberturas de aluminio con DVH",
    "Aislación térmica y acústica",
    "Cielorraso de hormigón visto",
    "Portero visor",
  ],
  amenities: ["Solárium común", "Quincho común", "Parrilla", "Huerta comunitaria"],
  fotos: [
    { src: `${FOTOS}/edificio-fachada.webp`, alt: "Fachada de Cataluña II de noche" },
    { src: `${FOTOS}/edificio-hall.webp`, alt: "Hall de entrada" },
    { src: `${FOTOS}/edificio-quincho.webp`, alt: "Quincho común en el piso 1" },
    { src: `${FOTOS}/edificio-terraza.webp`, alt: "Terraza con solárium en el piso 7" },
  ] satisfies Foto[],
};

export const ROOMS: Room[] = [
  {
    id: "estar",
    nombre: "Estar",
    piso: [
      [2.45, 5.4],
      [5.16, 5.4],
      [5.16, 8.66],
      [2.45, 8.66],
    ],
    medidas: "2,70 × 3,25 m",
    descripcion:
      "Amplio ambiente principal con vista a la calle y salida al balcón. Muros con aislación térmica y acústica, aberturas de aluminio negro.",
    fotos: [
      { src: `${FOTOS}/estar-1.webp`, alt: "Estar y comedor de la unidad 103" },
      { src: `${FOTOS}/estar-2.webp`, alt: "Estar con mueble de TV" },
    ],
  },
  {
    id: "dormitorio",
    nombre: "Dormitorio",
    piso: [
      [0, 5.4],
      [2.45, 5.4],
      [2.45, 8.66],
      [1.61, 8.66],
      [1.61, 7.96],
      [1.01, 7.96],
      [1.01, 8.66],
      [0, 8.66],
    ],
    medidas: "2,45 × 3,25 m",
    descripcion:
      "Sector de dormitorio integrado al ambiente, junto a la ventana. Porcelanato símil madera, placard en melamina a medida y calefacción por losa radiante.",
    fotos: [
      { src: `${FOTOS}/dormitorio-1.webp`, alt: "Sector de dormitorio de un monoambiente del piso 1" },
      { src: `${FOTOS}/dormitorio-2.webp`, alt: "Dormitorio con respaldo de listones" },
    ],
  },
  {
    id: "comedor",
    nombre: "Comedor",
    piso: [
      [1.61, 3.4],
      [5.16, 3.4],
      [5.16, 5.4],
      [0, 5.4],
      [0, 4.82],
      [1.61, 4.82],
    ],
    medidas: "3,55 × 2,00 m",
    descripcion: "Mesa para cuatro entre la isla de la cocina y el estar, con el placard a un lado.",
    fotos: [{ src: `${FOTOS}/comedor-1.webp`, alt: "Comedor y cocina de la unidad 103" }],
  },
  {
    id: "cocina",
    nombre: "Cocina",
    piso: [
      [1.61, 1.1],
      [5.16, 1.1],
      [5.16, 3.4],
      [1.61, 3.4],
    ],
    medidas: "3,55 × 2,30 m",
    descripcion:
      "Equipamiento a medida con isla, mesadas de cuarzo, grifería monocomando con cierre cerámico y bacha Johnson.",
    fotos: [
      { src: `${FOTOS}/cocina-1.webp`, alt: "Cocina con isla de la unidad 103" },
      { src: `${FOTOS}/cocina-2.webp`, alt: "Cocina y comedor vistos desde el estar" },
      { src: `${FOTOS}/cocina-3.webp`, alt: "Mueble de cocina a medida" },
    ],
  },
  {
    id: "bano",
    nombre: "Baño",
    piso: [
      [0, 1.9],
      [1.51, 1.9],
      [1.51, 4.0],
      [0, 4.0],
    ],
    medidas: "1,50 × 2,10 m",
    descripcion: "Grifería monocomando con cierre cerámico, ducha con mampara, espejo y accesorios.",
    fotos: [{ src: `${FOTOS}/bano-1.webp`, alt: "Baño con ducha y vanitory" }],
  },
  {
    id: "entrada",
    nombre: "Entrada",
    piso: [
      [1.61, 0],
      [2.72, 0],
      [2.72, 1.1],
      [1.61, 1.1],
    ],
    medidas: "1,10 m de ancho",
    descripcion: "Ingreso desde el palier del piso 1, directo a la cocina.",
    fotos: [],
  },
  {
    id: "balcon",
    nombre: "Balcón",
    piso: [
      [1.61, 8.84],
      [3.88, 8.84],
      [3.88, 10.25],
      [1.61, 10.25],
    ],
    medidas: "2,25 × 1,40 m · 3,4 m²",
    descripcion: "Balcón al frente, sobre la calle Buenos Aires, con salida desde el estar.",
    fotos: [],
  },
];

/** Walls, full height unless `y` says otherwise. */
export const WALLS: Block[] = [
  // Exterior
  { x: [-0.18, 0], z: [1.75, 8.84] },
  { x: [-0.18, 1.61], z: [1.75, 1.9] },
  { x: [1.43, 1.61], z: [-0.15, 1.9] },
  { x: [2.72, 2.86], z: [-0.15, 0.96] },
  { x: [2.72, 5.34], z: [0.96, 1.1] },
  { x: [5.16, 5.34], z: [0.96, 8.84] },
  // Street facade: pier and solid end; the rest is glazing
  { x: [1.01, 1.61], z: [7.96, 8.84] },
  { x: [4.71, 5.16], z: [8.66, 8.84] },
  // Over the entrance door
  { x: [1.61, 2.72], z: [-0.15, 0], y: [2.1, CEILING] },
  // Bathroom, with its door between z 2.75 and 3.25
  { x: [1.51, 1.61], z: [1.9, 2.75] },
  { x: [1.51, 1.61], z: [3.25, 4.0] },
  { x: [1.51, 1.61], z: [2.75, 3.25], y: [2.1, CEILING] },
  { x: [0, 1.61], z: [4.0, 4.2] },
  { x: [1.51, 1.61], z: [4.2, 4.82] },
  // Balcony side wall
  { x: [1.43, 1.61], z: [8.84, 10.25] },
];

/** Floor-to-ceiling glazing on the street facade. */
export const GLAZING: Block[] = [
  { x: [0, 1.01], z: [8.72, 8.78] },
  { x: [1.61, 3.88], z: [8.72, 8.78] },
  { x: [3.88, 4.71], z: [8.72, 8.78] },
];

/** Floor slabs (the unit's footprint) and the balcony deck. */
export const FLOORS: Block[] = [
  { x: [1.43, 2.86], z: [-0.15, 1.1] },
  { x: [1.43, 5.34], z: [0.96, 8.84] },
  { x: [-0.18, 1.61], z: [1.75, 8.84] },
];
export const BALCONY_FLOOR: Block = { x: [1.43, 3.92], z: [8.84, 10.25] };
export const RAILINGS: Block[] = [
  { x: [1.61, 3.92], z: [10.21, 10.25], y: [0, 1.0] },
  { x: [3.88, 3.92], z: [8.84, 10.25], y: [0, 1.0] },
];

const WHITE = "#efede8";
const MARBLE = "#f4f3f0";
const WOOD = "#b98d62";
const GREY = "#8d8a86";
const DARK = "#2a2b2e";

export const MUEBLES: Mueble[] = [
  // Kitchen: counter, upper cabinets, island, tall unit, stools
  { kind: "box", block: { x: [2.72, 5.16], z: [1.1, 1.68], y: [0, 0.92] }, color: MARBLE },
  { kind: "box", block: { x: [2.72, 5.16], z: [1.1, 1.45], y: [1.55, 2.35] }, color: WHITE },
  { kind: "box", block: { x: [2.72, 4.46], z: [2.64, 3.25], y: [0, 0.92] }, color: MARBLE },
  { kind: "box", block: { x: [4.46, 5.14], z: [2.62, 3.25], y: [0, 2.2] }, color: WHITE },
  { kind: "round", block: { x: [2.95, 3.3], z: [3.38, 3.73], y: [0, 0.66] }, color: WOOD },
  { kind: "round", block: { x: [3.45, 3.8], z: [3.38, 3.73], y: [0, 0.66] }, color: WOOD },
  { kind: "round", block: { x: [3.95, 4.3], z: [3.38, 3.73], y: [0, 0.66] }, color: WOOD },
  // Dining table and chairs
  { kind: "box", block: { x: [3.44, 5.11], z: [4.36, 4.92], y: [0, 0.76] }, color: MARBLE },
  { kind: "box", block: { x: [3.8, 4.2], z: [3.98, 4.34], y: [0, 0.46] }, color: WHITE },
  { kind: "box", block: { x: [4.55, 4.95], z: [3.98, 4.34], y: [0, 0.46] }, color: WHITE },
  { kind: "box", block: { x: [3.8, 4.2], z: [4.94, 5.3], y: [0, 0.46] }, color: WHITE },
  { kind: "box", block: { x: [4.55, 4.95], z: [4.94, 5.3], y: [0, 0.46] }, color: WHITE },
  // Wardrobe facing the room
  { kind: "box", block: { x: [0.02, 1.51], z: [4.2, 4.78], y: [0, 2.4] }, color: WHITE },
  // Bed, headboard, pillows, night tables
  { kind: "box", block: { x: [0.12, 2.04], z: [5.63, 7.23], y: [0, 0.5] }, color: "#d9d6d1" },
  { kind: "box", block: { x: [0.02, 0.12], z: [5.55, 7.31], y: [0, 1.05] }, color: GREY },
  { kind: "box", block: { x: [0.18, 0.55], z: [5.75, 6.35], y: [0.5, 0.64] }, color: "#a9a6a2" },
  { kind: "box", block: { x: [0.18, 0.55], z: [6.5, 7.1], y: [0.5, 0.64] }, color: "#a9a6a2" },
  { kind: "box", block: { x: [0.06, 0.46], z: [5.18, 5.5], y: [0, 0.5] }, color: WOOD },
  { kind: "box", block: { x: [0.06, 0.46], z: [7.36, 7.68], y: [0, 0.5] }, color: WOOD },
  // Living: sofa, coffee tables, TV unit and screen
  { kind: "box", block: { x: [2.93, 4.58], z: [7.8, 8.48], y: [0, 0.42] }, color: GREY },
  { kind: "box", block: { x: [2.93, 4.58], z: [8.28, 8.48], y: [0.42, 0.82] }, color: GREY },
  { kind: "round", block: { x: [3.14, 3.68], z: [6.9, 7.44], y: [0, 0.4] }, color: MARBLE },
  { kind: "round", block: { x: [3.59, 4.31], z: [6.78, 7.5], y: [0, 0.34] }, color: WOOD },
  { kind: "box", block: { x: [4.8, 5.14], z: [6.09, 8.59], y: [0, 0.45] }, color: WOOD },
  { kind: "box", block: { x: [5.11, 5.15], z: [6.8, 7.9], y: [1.0, 1.65] }, color: DARK },
  // Bathroom: toilet, bidet, vanity, shower screen
  { kind: "box", block: { x: [0.38, 0.8], z: [1.96, 2.6], y: [0, 0.42] }, color: "#ffffff" },
  { kind: "box", block: { x: [0.98, 1.36], z: [1.96, 2.52], y: [0, 0.42] }, color: "#ffffff" },
  { kind: "box", block: { x: [0.02, 0.48], z: [2.75, 3.35], y: [0, 0.86] }, color: WOOD },
  { kind: "box", block: { x: [0.02, 1.1], z: [3.38, 3.41], y: [0, 2.0] }, color: "#9fb4bb" },
  // Entrance door
  { kind: "box", block: { x: [1.66, 2.67], z: [-0.1, -0.05], y: [0, 2.05] }, color: WOOD },
  // Balcony chair
  { kind: "round", block: { x: [1.9, 2.5], z: [9.3, 9.9], y: [0, 0.4] }, color: DARK },
];

/** Plan center, used to put the unit at the scene's origin. */
export const CENTER: [number, number] = [2.58, 5.05];
