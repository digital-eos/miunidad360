"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { FichaUnidad } from "@/components/unidades/FichaUnidad";
import { formatArea } from "@/lib/units/format";
import { formatPrecio } from "@/lib/unidades/format";
import { attrNumber, type Unidad } from "@/lib/unidades/types";
import { STATUS_COLORS, STATUS_LABELS, STATUS_ORDER } from "@/lib/units/status-colors";
import {
  EMPTY_FILTERS,
  hasActiveFilters,
  unitMatchesFilters,
  type UnitFilters,
} from "@/lib/units/filters";
import { FloorPlanSvg } from "./FloorPlanSvg";

const ALL_FLOORS = "all";
const ROOMS_OPTIONS = [2, 3, 4];
const PRICE_OPTIONS = [120_000, 160_000, 200_000, 250_000];

function unitFloor(unit: Unidad) {
  return attrNumber(unit, "piso") ?? 1;
}

function pluralAvailable(count: number) {
  return `${count} ${count === 1 ? "disponible" : "disponibles"}`;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-200",
        active
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border-subtle text-foreground-muted hover:border-accent hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export type EdificioInfoPanelProps = {
  projectName: string;
  projectAddress: string | null;
  projectSlug: string;
  floors: number;
  units: Unidad[];
  filters: UnitFilters;
  onFiltersChange: (filters: UnitFilters) => void;
  orientations: string[];
  focusFloor: number | null;
  onSelectFloor: (floor: number | null) => void;
  selectedUnit: Unidad | null;
  onSelectUnit: (code: string | null) => void;
  onHoverUnit: (code: string | null) => void;
  sunHoursVerano: number | null;
  sunHoursInvierno: number | null;
  className?: string;
};

/**
 * The card beside the 3D view: pick a floor, filter, browse the units and open one. Shows
 * the whole building's figures when nothing is selected.
 */
export function EdificioInfoPanel({
  projectName,
  projectAddress,
  projectSlug,
  floors,
  units,
  filters,
  onFiltersChange,
  orientations,
  focusFloor,
  onSelectFloor,
  selectedUnit,
  onSelectUnit,
  onHoverUnit,
  sunHoursVerano,
  sunHoursInvierno,
  className,
}: EdificioInfoPanelProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const inScope = units.filter((u) => focusFloor === null || unitFloor(u) === focusFloor);
  const matching = inScope
    .filter((u) => unitMatchesFilters(u, filters))
    .sort((a, b) => unitFloor(b) - unitFloor(a) || a.codigo.localeCompare(b.codigo));
  const available = inScope.filter((u) => u.estado === "disponible" && u.precio != null);
  const minPrice = available.length ? Math.min(...available.map((u) => u.precio as number)) : null;
  const filtering = hasActiveFilters(filters);
  const scopeLabel = focusFloor === null ? "Todo el edificio" : `Piso ${focusFloor}`;

  const availableOn = (floor: number | null) =>
    pluralAvailable(
      units.filter(
        (u) => u.estado === "disponible" && (floor === null || unitFloor(u) === floor),
      ).length,
    );

  // When a unit opens, show its card from the top; on mobile the card sits below the 3D
  // view, so bring it on screen.
  useEffect(() => {
    if (!selectedUnit) return;
    scrollRef.current?.scrollTo({ top: 0 });
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect && rect.top > window.innerHeight * 0.75) {
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedUnit]);

  const floorList = Array.from({ length: floors }, (_, i) => floors - i);

  return (
    <div
      ref={rootRef}
      className={cn("flex scroll-mt-4 flex-col overflow-hidden bg-background", className)}
    >
      <div className="border-b border-border-subtle px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent-strong">
          {projectName}
          {projectAddress ? (
            <span className="text-foreground-muted"> · {projectAddress}</span>
          ) : null}
        </p>
        <label className="mt-3 block">
          <span className="text-xs font-medium text-foreground-muted">Piso</span>
          <select
            value={focusFloor === null ? ALL_FLOORS : String(focusFloor)}
            onChange={(e) =>
              onSelectFloor(e.target.value === ALL_FLOORS ? null : Number(e.target.value))
            }
            className="mt-1.5 w-full rounded-lg border border-border-subtle bg-background px-3 py-2.5 text-sm font-medium text-foreground focus:border-accent focus:outline-none"
          >
            <option value={ALL_FLOORS}>Edificio completo · {availableOn(null)}</option>
            {floorList.map((f) => (
              <option key={f} value={String(f)}>
                Piso {f} · {availableOn(f)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {selectedUnit ? (
          <FichaUnidad
            key={selectedUnit.codigo}
            unidad={selectedUnit}
            proyectoSlug={projectSlug}
            proyectoNombre={projectName}
            source="selector-unidad"
            onClose={() => onSelectUnit(null)}
            backLabel={focusFloor === null ? "Todas las unidades" : `Unidades del piso ${focusFloor}`}
            nota="Edificio Demo es un proyecto ficticio, creado solo para esta demo."
            media={
              <div className="rounded-xl border border-border-subtle bg-background-elevated p-3">
                <FloorPlanSvg
                  bedrooms={attrNumber(selectedUnit, "dormitorios") ?? 1}
                  areaM2={selectedUnit.superficieM2}
                  balconyM2={attrNumber(selectedUnit, "balcon_m2") ?? 0}
                  className="w-full"
                />
              </div>
            }
          >
            {sunHoursVerano != null || sunHoursInvierno != null ? (
              <div className="rounded-xl border border-border-subtle bg-background-elevated p-3">
                <p className="text-xs font-medium text-foreground-muted">
                  Sol directo en la fachada
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-foreground-muted">Verano</p>
                    <p>{sunHoursVerano != null ? `${sunHoursVerano.toFixed(1)} h` : "calculando…"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-muted">Invierno</p>
                    <p>
                      {sunHoursInvierno != null ? `${sunHoursInvierno.toFixed(1)} h` : "calculando…"}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </FichaUnidad>
        ) : (
          <div className="px-5 py-5">
            <p className="text-xs font-medium text-foreground-muted">{scopeLabel}</p>
            <p className="mt-1 font-display text-2xl">
              {pluralAvailable(available.length)}{" "}
              <span className="text-base text-foreground-muted">de {inScope.length} unidades</span>
            </p>
            {minPrice !== null ? (
              <p className="mt-1 text-sm text-foreground-muted">
                Desde {formatPrecio(minPrice, "USD")}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-foreground-muted">
              {STATUS_ORDER.map((status) => (
                <span key={status} className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[status] }}
                  />
                  {inScope.filter((u) => u.estado === status).length} {STATUS_LABELS[status]}
                </span>
              ))}
            </div>

            {/* Filters */}
            <div className="mt-5 space-y-3 rounded-xl border border-border-subtle bg-background-elevated/60 p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs font-medium text-foreground-muted">Ambientes</span>
                {ROOMS_OPTIONS.map((n) => (
                  <Chip
                    key={n}
                    active={filters.minRooms === n}
                    onClick={() =>
                      onFiltersChange({ ...filters, minRooms: filters.minRooms === n ? null : n })
                    }
                  >
                    {n}+
                  </Chip>
                ))}
              </div>
              {orientations.length ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-xs font-medium text-foreground-muted">Orientación</span>
                  {orientations.map((o) => (
                    <Chip
                      key={o}
                      active={filters.orientation === o}
                      onClick={() =>
                        onFiltersChange({
                          ...filters,
                          orientation: filters.orientation === o ? null : o,
                        })
                      }
                    >
                      {o}
                    </Chip>
                  ))}
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Precio máximo"
                  value={filters.maxPriceUsd ?? ""}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      maxPriceUsd: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="min-w-0 flex-1 rounded-full border border-border-subtle bg-background px-3 py-1 text-xs font-medium text-foreground focus:border-accent focus:outline-none"
                >
                  <option value="">Cualquier precio</option>
                  {PRICE_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      Hasta USD {p.toLocaleString("es-AR")}
                    </option>
                  ))}
                </select>
                <Chip
                  active={filters.onlyAvailable}
                  onClick={() =>
                    onFiltersChange({ ...filters, onlyAvailable: !filters.onlyAvailable })
                  }
                >
                  Solo disponibles
                </Chip>
              </div>
              {filtering ? (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground-muted">
                    {matching.length} de {inScope.length} coinciden
                  </span>
                  <button
                    type="button"
                    onClick={() => onFiltersChange(EMPTY_FILTERS)}
                    className="font-medium text-accent-strong hover:underline"
                  >
                    Limpiar filtros
                  </button>
                </div>
              ) : null}
            </div>

            <ul className="mt-5 border-b border-border-subtle" onMouseLeave={() => onHoverUnit(null)}>
              {matching.map((u, index) => {
                const floor = unitFloor(u);
                const header =
                  focusFloor === null && (index === 0 || unitFloor(matching[index - 1]) !== floor);
                const rooms = attrNumber(u, "ambientes");
                return (
                  <li key={u.codigo}>
                    {header ? (
                      <p className="border-t border-border-subtle pt-3 pb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground-muted">
                        Piso {floor}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onSelectUnit(u.codigo)}
                      onMouseEnter={() => onHoverUnit(u.codigo)}
                      onFocus={() => onHoverUnit(u.codigo)}
                      className={cn(
                        "flex w-full items-center gap-3 py-2.5 text-left transition-colors duration-200 hover:bg-background-elevated focus-visible:bg-background-elevated focus-visible:outline-none",
                        !header && "border-t border-border-subtle",
                      )}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[u.estado] }}
                        aria-label={STATUS_LABELS[u.estado]}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">
                          {u.codigo}
                          {rooms != null ? (
                            <span className="font-normal text-foreground-muted"> · {rooms} amb</span>
                          ) : null}
                        </span>
                        <span className="block text-xs text-foreground-muted">
                          {formatArea(u.superficieM2)}
                          {u.orientacion ? ` · ${u.orientacion}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-sm">
                        {u.estado === "vendida" ? (
                          <span className="text-foreground-muted">Vendida</span>
                        ) : (
                          formatPrecio(u.precio, u.moneda)
                        )}
                      </span>
                      <span aria-hidden="true" className="text-foreground-muted">
                        →
                      </span>
                    </button>
                  </li>
                );
              })}
              {matching.length === 0 ? (
                <li className="border-t border-border-subtle py-6 text-center text-sm text-foreground-muted">
                  Ninguna unidad coincide con estos filtros.
                </li>
              ) : null}
            </ul>

            <p className="mt-4 text-xs text-foreground-muted">
              Tocá una unidad en el 3D o en la lista para ver sus datos. Precios y estados ficticios,
              solo para esta demo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
