import type { Atributos, UnidadRow } from "@/db/schema";
import type { UnitStatus } from "@/lib/units/demo-data";

export type { Atributos };

export type UnidadTipo = UnidadRow["tipo"];
export type Moneda = UnidadRow["moneda"];
export type Estado = UnitStatus;

/**
 * Una unidad tal como la usa la interfaz: los numéricos de Postgres ya convertidos a número.
 * Es lo que devuelve /api/projects/[slug]/unidades.
 */
export type Unidad = {
  id: number;
  proyectoId: number;
  tipo: UnidadTipo;
  codigo: string;
  sector: string | null;
  superficieM2: number;
  superficieTerrenoM2: number | null;
  orientacion: string | null;
  precio: number | null;
  moneda: Moneda;
  estado: Estado;
  objeto3d: string | null;
  atributos: Atributos;
};

export function toUnidad(row: UnidadRow): Unidad {
  return {
    id: row.id,
    proyectoId: row.proyectoId,
    tipo: row.tipo,
    codigo: row.codigo,
    sector: row.sector,
    superficieM2: Number.parseFloat(row.superficieM2),
    superficieTerrenoM2:
      row.superficieTerrenoM2 == null ? null : Number.parseFloat(row.superficieTerrenoM2),
    orientacion: row.orientacion,
    precio: row.precio,
    moneda: row.moneda,
    estado: row.estado,
    objeto3d: row.objeto3d,
    atributos: row.atributos ?? {},
  };
}

/** A numeric attribute, or null when it is missing or not a number. */
export function attrNumber(unidad: Unidad, key: string): number | null {
  const value = unidad.atributos[key];
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

/** Finds a unit by its public code, falling back to its 3D object name (older links). */
export function findUnidad(unidades: Unidad[], code: string | null): Unidad | null {
  if (!code) return null;
  return (
    unidades.find((u) => u.codigo === code) ?? unidades.find((u) => u.objeto3d === code) ?? null
  );
}
