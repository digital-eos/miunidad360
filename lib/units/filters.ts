import { attrNumber, type Unidad } from "@/lib/unidades/types";

export type UnitFilters = {
  minRooms: number | null;
  maxPriceUsd: number | null;
  minFloor: number | null;
  orientation: string | null;
  onlyAvailable: boolean;
};

export const EMPTY_FILTERS: UnitFilters = {
  minRooms: null,
  maxPriceUsd: null,
  minFloor: null,
  orientation: null,
  onlyAvailable: false,
};

export function unitMatchesFilters(unit: Unidad, filters: UnitFilters): boolean {
  const rooms = attrNumber(unit, "ambientes") ?? 0;
  const floor = attrNumber(unit, "piso") ?? 0;
  if (filters.minRooms != null && rooms < filters.minRooms) return false;
  if (filters.maxPriceUsd != null && (unit.precio == null || unit.precio > filters.maxPriceUsd)) {
    return false;
  }
  if (filters.minFloor != null && floor < filters.minFloor) return false;
  if (filters.orientation != null && unit.orientacion !== filters.orientation) return false;
  if (filters.onlyAvailable && unit.estado !== "disponible") return false;
  return true;
}

export function hasActiveFilters(filters: UnitFilters): boolean {
  return (
    filters.minRooms != null ||
    filters.maxPriceUsd != null ||
    filters.minFloor != null ||
    filters.orientation != null ||
    filters.onlyAvailable
  );
}
