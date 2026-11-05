"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { bimUnits, bimUnitsByName, floorLevels } from "@/lib/bim/dataset";
import { formatArea, formatUsdPrice } from "@/lib/units/format";
import { STATUS_COLORS, STATUS_LABELS, STATUS_ORDER } from "@/lib/units/status-colors";
import { UnitDetails } from "./UnitDetails";
import { AvanceCalendar } from "./AvanceCalendar";
import type { BimViewer } from "./use-bim-viewer";

const ALL_FLOORS = "all";

function availableLabel(floor: number | null) {
  const count = bimUnits.filter(
    (u) => u.status === "disponible" && (floor === null || u.floor === floor)
  ).length;
  return pluralAvailable(count);
}

function pluralAvailable(count: number) {
  return `${count} ${count === 1 ? "disponible" : "disponibles"}`;
}

/**
 * The info card beside the 3D view: pick a floor, see its units and their status, open one
 * unit's data. Shows the whole project's figures when nothing is selected.
 */
export function BimInfoPanel({
  viewer,
  projectName,
  className,
}: {
  viewer: BimViewer;
  projectName: string;
  className?: string;
}) {
  const {
    mode,
    floor,
    selectedUnit,
    selectFloor,
    openUnit,
    closeUnit,
    currentWeek,
    isPlaying,
    changeWeek,
    togglePlay,
    completeBuild,
  } = viewer;
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const unit = selectedUnit ? (bimUnitsByName.get(selectedUnit) ?? null) : null;
  const scopeFloor = mode === "avance" ? null : floor;
  const scopeLabel =
    scopeFloor === null
      ? "Todo el edificio"
      : (floorLevels.find((f) => f.floor === scopeFloor)?.label ?? "");
  const units = bimUnits
    .filter((u) => scopeFloor === null || u.floor === scopeFloor)
    .sort((a, b) => a.floor - b.floor || a.number - b.number);
  const available = units.filter((u) => u.status === "disponible");
  const minPrice = available.length
    ? Math.min(...available.map((u) => u.priceUsd))
    : null;

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
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent-strong">
          {projectName}
        </p>
        {mode === "avance" ? (
          <p className="mt-2 text-sm text-foreground-muted">
            Avance de obra: elegí una semana o tocá ▶ para verla crecer en el 3D.
          </p>
        ) : (
          <label className="mt-3 block">
            <span className="text-xs font-medium text-foreground-muted">Piso</span>
            <select
              value={floor === null ? ALL_FLOORS : String(floor)}
              onChange={(e) =>
                selectFloor(e.target.value === ALL_FLOORS ? null : Number(e.target.value))
              }
              className="mt-1.5 w-full rounded-lg border border-border-subtle bg-background px-3 py-2.5 text-sm font-medium text-foreground focus:border-accent focus:outline-none"
            >
              <option value={ALL_FLOORS}>
                Edificio completo · {availableLabel(null)}
              </option>
              {floorLevels.map((f) => (
                <option key={f.floor} value={String(f.floor)}>
                  {f.label} · {availableLabel(f.floor)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {mode === "avance" ? (
          <AvanceCalendar
            embedded
            currentWeek={currentWeek}
            isPlaying={isPlaying}
            onChangeWeek={changeWeek}
            onTogglePlay={togglePlay}
            onCompleteBuild={completeBuild}
          />
        ) : unit ? (
          <UnitDetails
            key={unit.name}
            unit={unit}
            onBack={closeUnit}
            backLabel={
              scopeFloor === null
                ? "Todas las unidades"
                : scopeFloor === 0
                  ? "Unidades de la planta baja"
                  : `Unidades del ${scopeLabel}`
            }
          />
        ) : (
          <div className="px-5 py-5">
            <p className="text-xs font-medium text-foreground-muted">{scopeLabel}</p>
            <p className="mt-1 font-display text-2xl">
              {pluralAvailable(available.length)}{" "}
              <span className="text-base text-foreground-muted">
                de {units.length} unidades
              </span>
            </p>
            {minPrice !== null ? (
              <p className="mt-1 text-sm text-foreground-muted">
                Desde {formatUsdPrice(minPrice)}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-foreground-muted">
              {STATUS_ORDER.map((status) => (
                <span key={status} className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[status] }}
                  />
                  {units.filter((u) => u.status === status).length}{" "}
                  {STATUS_LABELS[status]}
                </span>
              ))}
            </div>

            <ul className="mt-5 divide-y divide-border-subtle border-y border-border-subtle">
              {units.map((u) => (
                <li key={u.name}>
                  <button
                    type="button"
                    onClick={() => openUnit(u.name)}
                    className="flex w-full items-center gap-3 py-3 text-left transition-colors duration-200 hover:bg-background-elevated focus-visible:bg-background-elevated focus-visible:outline-none"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[u.status] }}
                      aria-label={STATUS_LABELS[u.status]}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {u.name}
                        {scopeFloor === null ? (
                          <span className="font-normal text-foreground-muted">
                            {" "}
                            · {u.storey}
                          </span>
                        ) : null}
                      </span>
                      <span className="block text-xs text-foreground-muted">
                        {u.rooms} amb · {formatArea(u.area_m2)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-sm">
                      {u.status === "vendida" ? (
                        <span className="text-foreground-muted">Vendida</span>
                      ) : (
                        formatUsdPrice(u.priceUsd)
                      )}
                    </span>
                    <span aria-hidden="true" className="text-foreground-muted">
                      →
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-xs text-foreground-muted">
              {mode === "unidades"
                ? "Tocá una unidad en el 3D o en la lista para ver sus datos."
                : "Elegí una unidad de la lista para ver sus datos."}{" "}
              Precios y estados ficticios, solo para esta demo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
