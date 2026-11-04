"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { EMPTY_FILTERS, hasActiveFilters, type UnitFilters } from "@/lib/units/filters";

const ROOMS_OPTIONS = [2, 3, 4];
const PRICE_OPTIONS = [120_000, 160_000, 200_000, 250_000];
const FLOOR_OPTIONS = [1, 4, 7, 10];

const selectClasses =
  "w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none";

export function FiltersPanel({
  filters,
  onChange,
  orientations,
}: {
  filters: UnitFilters;
  onChange: (filters: UnitFilters) => void;
  orientations: string[];
}) {
  const [open, setOpen] = useState(false);
  const active = hasActiveFilters(filters);

  return (
    <div className="pointer-events-none absolute right-4 top-4 flex flex-col items-end gap-2 sm:right-6 sm:top-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "pointer-events-auto flex items-center gap-2 rounded-full border border-border-subtle bg-background/80 px-4 py-2 text-xs font-medium backdrop-blur-md transition-colors duration-200 sm:text-sm",
          active ? "border-accent text-accent-strong" : "hover:border-accent hover:text-accent-strong",
        )}
      >
        Filtros{active ? " ·" : ""}
        {active ? <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden /> : null}
      </button>

      {open ? (
        <div className="pointer-events-auto w-64 space-y-3 rounded-2xl border border-border-subtle bg-background/95 p-4 backdrop-blur-md">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground-muted">
              Ambientes mínimos
            </label>
            <select
              className={selectClasses}
              value={filters.minRooms ?? ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  minRooms: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">Cualquiera</option>
              {ROOMS_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}+ ambientes
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-foreground-muted">
              Precio máximo (USD)
            </label>
            <select
              className={selectClasses}
              value={filters.maxPriceUsd ?? ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  maxPriceUsd: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">Cualquiera</option>
              {PRICE_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  Hasta USD {p.toLocaleString("es-AR")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-foreground-muted">
              Piso mínimo
            </label>
            <select
              className={selectClasses}
              value={filters.minFloor ?? ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  minFloor: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">Cualquiera</option>
              {FLOOR_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  Piso {f}+
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-foreground-muted">
              Orientación
            </label>
            <select
              className={selectClasses}
              value={filters.orientation ?? ""}
              onChange={(e) => onChange({ ...filters, orientation: e.target.value || null })}
            >
              <option value="">Cualquiera</option>
              {orientations.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.onlyAvailable}
              onChange={(e) => onChange({ ...filters, onlyAvailable: e.target.checked })}
              className="h-4 w-4 accent-accent"
            />
            Solo disponibles
          </label>

          {active ? (
            <button
              type="button"
              onClick={() => onChange(EMPTY_FILTERS)}
              className="w-full rounded-full border border-border-subtle py-1.5 text-xs font-medium transition-colors duration-200 hover:border-accent hover:text-accent-strong"
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
