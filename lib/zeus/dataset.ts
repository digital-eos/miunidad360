import rawData from "@/data/zeus3.json";
import rawGeometry from "@/data/zeus3-geometria.json";
import type { UnitStatus } from "@/lib/units/demo-data";
import { attrNumber, type Moneda, type Unidad } from "@/lib/unidades/types";

/**
 * Zeus III (Pinamar): the 3D model is built from the project's PDF plans by
 * MiUnidad360-conversor/maqueta_planos.py; the unit data comes from data/zeus3.json, in the
 * format we ask developers for (see ZeusData).
 */

export type ZeusUnidadData = {
  codigo: string;
  /** Name of the unit's volume in the 3D model ("APT-3B"). */
  objeto3d: string;
  tipo: "departamento";
  piso: number;
  letra: string;
  superficie_cubierta_m2: number;
  balcon_m2: number | null;
  patio_m2: number | null;
  ambientes: number;
  dormitorios: number;
  banos: number;
  orientacion: string | null;
  precio: number | null;
  moneda: Moneda;
  estado: UnitStatus;
  /** Floor plan image of the unit. */
  plano: string;
};

export type ZeusCocheraData = {
  codigo: string;
  tipo: "cochera";
  nivel: string;
  cubierta: boolean;
  precio: number | null;
  moneda: Moneda;
  estado: UnitStatus;
};

export type ZeusImagen = { src: string; miniatura: string; alt: string };

export type ZeusData = {
  proyecto: {
    slug: string;
    nombre: string;
    ubicacion: string;
    estudio: string;
    descripcion: string;
    moneda: Moneda;
    entrega: string | null;
  };
  niveles: { piso: number; nombre: string }[];
  unidades: ZeusUnidadData[];
  cocheras: ZeusCocheraData[];
  galeria: ZeusImagen[];
};

type ZeusGeometry = {
  niveles: { piso: number; nombre: string; cota_m: number }[];
  tamano_m: number[];
  altura_piso_m: number;
};

export const zeusData = rawData as ZeusData;
const geometry = rawGeometry as ZeusGeometry;

export const ZEUS_SLUG = "zeus3";
export const ZEUS_PATH = `/demos/${ZEUS_SLUG}`;
export const ZEUS_MODEL_URL = `/models/${ZEUS_SLUG}.glb`;

export const STOREY_HEIGHT = geometry.altura_piso_m;
/** Building size in meters (x, y, z), centered on x/z, ground floor at y = 0. */
export const ZEUS_SIZE = {
  width: geometry.tamano_m[0],
  height: geometry.tamano_m[1],
  depth: geometry.tamano_m[2],
};

export const zeusNiveles = zeusData.niveles;

export const zeusUnidades: Unidad[] = zeusData.unidades.map((u, index) => ({
  id: -(index + 1),
  proyectoId: 0,
  tipo: u.tipo,
  codigo: u.codigo,
  sector: zeusNiveles.find((n) => n.piso === u.piso)?.nombre ?? null,
  superficieM2: u.superficie_cubierta_m2,
  superficieTerrenoM2: null,
  orientacion: u.orientacion,
  precio: u.precio,
  moneda: u.moneda,
  estado: u.estado,
  objeto3d: u.objeto3d,
  atributos: {
    piso: u.piso,
    ambientes: u.ambientes,
    dormitorios: u.dormitorios,
    banos: u.banos,
    balcon_m2: u.balcon_m2,
    patio_m2: u.patio_m2,
  },
}));

const planos = new Map(zeusData.unidades.map((u) => [u.objeto3d, u.plano]));

export function zeusPlano(objeto3d: string | null): string | null {
  return objeto3d ? (planos.get(objeto3d) ?? null) : null;
}

export function zeusFloor(unidad: Unidad): number | null {
  return attrNumber(unidad, "piso");
}

/** Floor of a mesh from its name: "P3-muros" and "APT-3B" are on floor 3. */
export function meshFloor(name: string): number | null {
  const match = /^(?:P|APT-)(\d+)/.exec(name);
  return match ? Number(match[1]) : null;
}

/** The floor at a given height (the roof counts as the top floor). */
export function floorAtHeight(y: number): number {
  const top = zeusNiveles[zeusNiveles.length - 1].piso;
  return Math.max(0, Math.min(top, Math.floor(y / STOREY_HEIGHT)));
}
