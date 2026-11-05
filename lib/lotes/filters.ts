import type { Unidad } from "@/lib/unidades/types";

export type RangoSuperficie = "hasta-800" | "800-1000" | "mas-1000";

export type LoteFilters = {
  superficie: RangoSuperficie | null;
  precioMax: number | null;
  orientacion: string | null;
  frenteLaguna: boolean;
  soloDisponibles: boolean;
  manzana: number | null;
};

export const EMPTY_LOTE_FILTERS: LoteFilters = {
  superficie: null,
  precioMax: null,
  orientacion: null,
  frenteLaguna: false,
  soloDisponibles: false,
  manzana: null,
};

export const RANGOS_SUPERFICIE: { value: RangoSuperficie; label: string }[] = [
  { value: "hasta-800", label: "Hasta 800 m²" },
  { value: "800-1000", label: "800 a 1.000 m²" },
  { value: "mas-1000", label: "Más de 1.000 m²" },
];

export const PRECIOS_MAX = [90_000, 110_000, 130_000];

export function loteMatches(lote: Unidad, f: LoteFilters): boolean {
  const m2 = lote.superficieM2;
  if (f.superficie === "hasta-800" && m2 > 800) return false;
  if (f.superficie === "800-1000" && (m2 < 800 || m2 > 1000)) return false;
  if (f.superficie === "mas-1000" && m2 <= 1000) return false;
  if (f.precioMax != null && (lote.precio == null || lote.precio > f.precioMax)) return false;
  if (f.orientacion && lote.orientacion !== f.orientacion) return false;
  if (f.frenteLaguna && lote.atributos.frente_laguna !== true) return false;
  if (f.soloDisponibles && lote.estado !== "disponible") return false;
  if (f.manzana != null && Number(lote.atributos.manzana) !== f.manzana) return false;
  return true;
}

/** Whether any filter other than the manzana chip is set. */
export function hasPanelFilters(f: LoteFilters): boolean {
  return (
    f.superficie != null ||
    f.precioMax != null ||
    f.orientacion != null ||
    f.frenteLaguna ||
    f.soloDisponibles
  );
}
