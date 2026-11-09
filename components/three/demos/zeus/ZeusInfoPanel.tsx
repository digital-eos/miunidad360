"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { formatArea } from "@/lib/units/format";
import { formatPrecio } from "@/lib/unidades/format";
import { attrNumber, type Unidad } from "@/lib/unidades/types";
import { STATUS_COLORS, STATUS_LABELS, STATUS_ORDER } from "@/lib/units/status-colors";
import { FichaUnidad } from "@/components/unidades/FichaUnidad";
import { ZEUS_SLUG, zeusData, zeusFloor, zeusNiveles, zeusPlano } from "@/lib/zeus/dataset";
import type { ZeusViewer } from "./use-zeus-viewer";

const ALL_FLOORS = "all";

function pluralAvailable(count: number) {
  return `${count} ${count === 1 ? "disponible" : "disponibles"}`;
}

function availableOn(unidades: Unidad[], floor: number | null) {
  return unidades.filter(
    (u) => u.estado === "disponible" && (floor === null || zeusFloor(u) === floor)
  ).length;
}

/** The card beside the 3D view: pick a floor, browse its units, open one with its plan. */
export function ZeusInfoPanel({ viewer, className }: { viewer: ZeusViewer; className?: string }) {
  const { floor, selectedUnit, selectFloor, openUnit, closeUnit, unidades, unidadesByObjeto } =
    viewer;
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { proyecto, cocheras } = zeusData;

  const unit = selectedUnit ? (unidadesByObjeto.get(selectedUnit) ?? null) : null;
  const scopeLabel =
    floor === null
      ? "Todo el edificio"
      : (zeusNiveles.find((n) => n.piso === floor)?.nombre ?? "");
  const units = unidades
    .filter((u) => floor === null || zeusFloor(u) === floor)
    .sort((a, b) => (zeusFloor(a) ?? 0) - (zeusFloor(b) ?? 0) || a.codigo.localeCompare(b.codigo));
  const available = units.filter((u) => u.estado === "disponible" && u.precio != null);
  const minPrice = available.length
    ? Math.min(...available.map((u) => u.precio as number))
    : null;
  const freeParking = cocheras.filter((c) => c.estado === "disponible").length;

  useEffect(() => {
    if (!selectedUnit) return;
    scrollRef.current?.scrollTo({ top: 0 });
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect && rect.top > window.innerHeight * 0.75) {
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedUnit]);

  const plano = zeusPlano(selectedUnit);

  return (
    <div
      ref={rootRef}
      className={cn("flex scroll-mt-4 flex-col overflow-hidden bg-background", className)}
    >
      <div className="border-b border-border-subtle px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent-strong">
          {proyecto.nombre} · {proyecto.ubicacion}
        </p>
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
              Edificio completo · {pluralAvailable(availableOn(unidades, null))}
            </option>
            {zeusNiveles.map((n) => (
              <option key={n.piso} value={String(n.piso)}>
                {n.nombre} · {pluralAvailable(availableOn(unidades, n.piso))}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {unit ? (
          <FichaUnidad
            key={unit.codigo}
            unidad={unit}
            proyectoSlug={ZEUS_SLUG}
            proyectoNombre={proyecto.nombre}
            source="zeus-unidad"
            onClose={closeUnit}
            backLabel={floor === 0 ? "Unidades de la planta baja" : `Unidades del ${scopeLabel}`}
            media={
              plano ? (
                <a
                  href={plano}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 block overflow-hidden rounded-xl border border-border-subtle bg-white"
                  aria-label={`Ver el plano de ${unit.codigo} en grande`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={plano}
                    alt={`Plano de ${unit.codigo}`}
                    className="h-auto max-h-80 w-full object-contain"
                  />
                </a>
              ) : null
            }
            nota="Superficies según planos. Precios y estados ficticios, solo para esta demo."
          />
        ) : (
          <div className="px-5 py-5">
            <p className="text-xs font-medium text-foreground-muted">{scopeLabel}</p>
            <p className="mt-1 font-display text-2xl">
              {pluralAvailable(available.length)}{" "}
              <span className="text-base text-foreground-muted">de {units.length} unidades</span>
            </p>
            {minPrice !== null ? (
              <p className="mt-1 text-sm text-foreground-muted">
                Desde {formatPrecio(minPrice, proyecto.moneda)}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-foreground-muted">
              {STATUS_ORDER.map((status) => (
                <span key={status} className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[status] }}
                  />
                  {units.filter((u) => u.estado === status).length} {STATUS_LABELS[status]}
                </span>
              ))}
            </div>

            <ul className="mt-5 divide-y divide-border-subtle border-y border-border-subtle">
              {units.map((u) => (
                <li key={u.codigo}>
                  <button
                    type="button"
                    onClick={() => u.objeto3d && openUnit(u.objeto3d)}
                    className="flex w-full items-center gap-3 py-3 text-left transition-colors duration-200 hover:bg-background-elevated focus-visible:bg-background-elevated focus-visible:outline-none"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[u.estado] }}
                      aria-label={STATUS_LABELS[u.estado]}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{u.codigo}</span>
                      <span className="block text-xs text-foreground-muted">
                        {attrNumber(u, "dormitorios")} dorm · {formatArea(u.superficieM2)}
                        {attrNumber(u, "balcon_m2") ? " + balcón" : ""}
                        {attrNumber(u, "patio_m2") ? " + patio" : ""}
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
              ))}
            </ul>

            {floor === null ? (
              <p className="mt-4 text-sm text-foreground-muted">
                Cocheras: {freeParking} disponibles de {cocheras.length}, en subsuelo.
              </p>
            ) : null}

            <p className="mt-4 text-xs text-foreground-muted">
              Tocá un piso o una unidad en el 3D, o elegila en la lista. Superficies según
              planos; precios y estados ficticios, solo para esta demo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
