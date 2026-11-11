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
        "rounded-md border px-3 py-1 text-xs font-medium transition-colors duration-200",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border-subtle text-foreground-muted hover:border-primary hover:text-foreground",
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
  units: Unidad[];
  filters: UnitFilters;
  onFiltersChange: (filters: UnitFilters) => void;
  orientations: string[];
  focusFloor: number | null;
  selectedUnit: Unidad | null;
  onSelectUnit: (code: string | null) => void;
  onHoverUnit: (code: string | null) => void;
  sunHoursVerano: number | null;
  sunHoursInvierno: number | null;
  /** Interior photos of the selected unit, shown under its floor plan. */
  selectedPhotos?: string[];
  /** Opens the sample apartment interior; no button when not set. */
  onViewInterior?: () => void;
  className?: string;
};

/**
 * The card beside the 3D view: filter, browse the units and open one. Shows
 * the whole building's figures when nothing is selected.
 */
export function EdificioInfoPanel({
  projectName,
  projectAddress,
  projectSlug,
  units,
  filters,
  onFiltersChange,
  orientations,
  focusFloor,
  selectedUnit,
  onSelectUnit,
  onHoverUnit,
  sunHoursVerano,
  sunHoursInvierno,
  selectedPhotos = [],
  onViewInterior,
  className,
}: EdificioInfoPanelProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const inScope = units.filter((u) => focusFloor === null || unitFloor(u) === focusFloor);
  const matching = inScope
    .filter((u) => unitMatchesFilters(u, filters))
    .sort((a, b) => unitFloor(b) - unitFloor(a) || a.codigo.localeCompare(b.codigo));
  const available = inScope.filter((u) => u.estado === "disponible");
  const priced = available.filter((u) => u.precio != null);
  const minPrice = priced.length ? Math.min(...priced.map((u) => u.precio as number)) : null;
  const hasPrices = units.some((u) => u.precio != null);
  const filtering = hasActiveFilters(filters);
  const scopeLabel = focusFloor === null ? "Todo el edificio" : `Piso ${focusFloor}`;

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

  return (
    <div
      ref={rootRef}
      className={cn("flex scroll-mt-4 flex-col overflow-hidden bg-background", className)}
    >
      <div className="border-b border-border-subtle px-5 py-4">
        <p className="label-caps text-primary">
          {projectName}
          {projectAddress ? (
            <span className="text-foreground-muted"> · {projectAddress}</span>
          ) : null}
        </p>
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
            nota="Modelo 3D ilustrativo."
            media={
              <div className="space-y-3">
                <div className="rounded-lg border border-border-subtle bg-surface-muted p-3">
                  <FloorPlanSvg
                    bedrooms={attrNumber(selectedUnit, "dormitorios") ?? 1}
                    areaM2={selectedUnit.superficieM2}
                    balconyM2={attrNumber(selectedUnit, "balcon_m2") ?? 0}
                    className="w-full"
                  />
                </div>
                {selectedPhotos.length ? (
                  <div className="grid grid-cols-2 gap-3">
                    {selectedPhotos.slice(0, 2).map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={src}
                        src={src}
                        alt={`${selectedUnit.codigo}, foto ${i + 1}`}
                        className="aspect-[4/3] w-full rounded-lg object-cover"
                      />
                    ))}
                  </div>
                ) : null}
                {onViewInterior ? (
                  <button
                    type="button"
                    onClick={onViewInterior}
                    className="btn btn-primary w-full"
                  >
                    Ver el interior en 3D <span aria-hidden="true">→</span>
                  </button>
                ) : null}
              </div>
            }
          >
            {sunHoursVerano != null || sunHoursInvierno != null ? (
              <div className="rounded-lg border border-border-subtle bg-surface-muted p-3">
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
            <div className="mt-5 space-y-3 rounded-lg border border-border-subtle bg-surface-muted/60 p-3">
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
                {hasPrices ? (
                  <select
                    aria-label="Precio máximo"
                    value={filters.maxPriceUsd ?? ""}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        maxPriceUsd: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="min-w-0 flex-1 rounded-md border border-border-subtle bg-background px-3 py-1 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="">Cualquier precio</option>
                    {PRICE_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        Hasta USD {p.toLocaleString("es-AR")}
                      </option>
                    ))}
                  </select>
                ) : null}
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
                    className="font-medium text-primary hover:underline"
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
                // Sold or reserved units are listed for context but cannot be opened.
                const forSale = u.estado === "disponible";
                return (
                  <li key={u.codigo}>
                    {header ? (
                      <p className="border-t border-border-subtle pt-3 pb-1 label-caps text-foreground-muted">
                        Piso {floor}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      disabled={!forSale}
                      onClick={() => onSelectUnit(u.codigo)}
                      onMouseEnter={() => onHoverUnit(forSale ? u.codigo : null)}
                      onFocus={() => onHoverUnit(u.codigo)}
                      className={cn(
                        "flex w-full items-center gap-3 py-2.5 text-left transition-colors duration-200",
                        forSale
                          ? "hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none"
                          : "cursor-default opacity-55",
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
                        {forSale ? (
                          formatPrecio(u.precio, u.moneda)
                        ) : (
                          <span className="text-foreground-muted">{STATUS_LABELS[u.estado]}</span>
                        )}
                      </span>
                      <span
                        aria-hidden="true"
                        className={cn("text-foreground-muted", !forSale && "invisible")}
                      >
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
