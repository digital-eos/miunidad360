import type { Unit } from "@/db/schema";

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

export function unitMatchesFilters(unit: Unit, filters: UnitFilters): boolean {
  if (filters.minRooms != null && unit.rooms < filters.minRooms) return false;
  if (filters.maxPriceUsd != null && unit.priceUsd > filters.maxPriceUsd) return false;
  if (filters.minFloor != null && unit.floor < filters.minFloor) return false;
  if (filters.orientation != null && unit.orientation !== filters.orientation) return false;
  if (filters.onlyAvailable && unit.status !== "disponible") return false;
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
