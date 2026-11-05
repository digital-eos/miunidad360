"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { useElementAspect } from "@/lib/hooks/use-element-aspect";
import { readUnidadParam, writeUnidadParam } from "@/lib/hooks/use-unidad-param";
import { sphereFitDistance } from "@/lib/three/camera-framing";
import { trackFilterUsed, trackUnitOpened } from "@/lib/analytics";
import { fetchUnidades } from "@/lib/unidades/fetch";
import { findUnidad, type Unidad } from "@/lib/unidades/types";
import { STATUS_COLORS, STATUS_LABELS, STATUS_ORDER } from "@/lib/units/status-colors";
import { LOTE_GEOMS_BY_CODIGO, MANZANA_GEOMS, type Vec2 } from "@/lib/lotes/barrio";
import {
  LOTES_PROJECT_NAME,
  LOTES_PROJECT_SLUG,
  buildLotesUnidades,
} from "@/lib/lotes/data";
import {
  EMPTY_LOTE_FILTERS,
  PRECIOS_MAX,
  RANGOS_SUPERFICIE,
  hasPanelFilters,
  loteMatches,
  type LoteFilters,
  type RangoSuperficie,
} from "@/lib/lotes/filters";
import type { Viewpoint } from "@/components/three/demos/maqueta/CameraRig";
import { FichaUnidad } from "@/components/unidades/FichaUnidad";
import { LotesScene } from "./LotesScene";
import { LotesPlano } from "./LotesPlano";

const FOV = 40;
/** Viewing direction from the target towards the camera: south-east from above on wide
 * screens, nearly due south on phones so the neighbourhood fits a portrait screen. */
const VIEW_DIR = new THREE.Vector3(0.32, 0.78, 0.54).normalize();
const VIEW_DIR_MOBILE = new THREE.Vector3(0.05, 0.86, 0.5).normalize();
const ORIENTACIONES = ["N", "S", "E", "O"];

function viewFrom(target: Vec2, distance: number, dir = VIEW_DIR): Viewpoint {
  return {
    position: [
      target[0] + dir.x * distance,
      dir.y * distance,
      target[1] + dir.z * distance,
    ],
    target: [target[0], 0, target[1]],
  };
}

const selectClasses =
  "w-full rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none";

const pillClasses =
  "pointer-events-auto rounded-full border border-border-subtle bg-background/85 px-4 py-2 text-xs font-medium backdrop-blur-md transition-colors duration-200 hover:border-accent hover:text-accent-strong sm:text-sm";

export function LotesExperience() {
  const containerRef = useRef<HTMLDivElement>(null);
  const aspect = useElementAspect(containerRef);
  const isMobile = useIsMobile();
  const reducedMotion = usePrefersReducedMotion();

  const [unidades, setUnidades] = useState<Unidad[]>(() => buildLotesUnidades());
  const [filters, setFilters] = useState<LoteFilters>(EMPTY_LOTE_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [plano, setPlano] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  // ?capture=1 hides the controls, for screenshots and recordings (as in the other demos).
  const [capturing] = useState(
    () => new URLSearchParams(window.location.search).get("capture") === "1"
  );

  // Live prices and statuses; the built-in copy stays if the database is unreachable.
  useEffect(() => {
    let cancelled = false;
    fetchUnidades(LOTES_PROJECT_SLUG)
      .then((data) => {
        if (!cancelled && data.unidades.length > 0) setUnidades(data.unidades);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Open the lot named in ?unidad= (shareable link).
  useEffect(() => {
    const unidad = findUnidad(buildLotesUnidades(), readUnidadParam());
    if (!unidad) return;
    const id = setTimeout(() => setSelected(unidad.codigo), 0);
    return () => clearTimeout(id);
  }, []);

  const unidadesByCodigo = useMemo(
    () => new Map(unidades.map((u) => [u.codigo, u])),
    [unidades]
  );
  const matches = useMemo(
    () => new Set(unidades.filter((u) => loteMatches(u, filters)).map((u) => u.codigo)),
    [unidades, filters]
  );
  const disponibles = useMemo(
    () =>
      unidades.filter((u) => matches.has(u.codigo) && u.estado === "disponible").length,
    [unidades, matches]
  );

  const selectLote = useCallback((codigo: string | null) => {
    setSelected(codigo);
    writeUnidadParam(codigo);
    if (codigo) trackUnitOpened("lotes", codigo);
  }, []);

  const handleHover = useCallback((codigo: string, hovering: boolean) => {
    setHovered((current) => (hovering ? codigo : current === codigo ? null : current));
  }, []);

  const updateFilters = (next: LoteFilters) => {
    setFilters(next);
    trackFilterUsed("lotes");
  };

  // Camera: the open lot, else the chosen manzana, else the whole neighbourhood.
  const overviewDistance = Math.min(
    Math.max(sphereFitDistance(195, FOV, aspect, 0.05), 330),
    isMobile ? 1100 : 900
  );
  const dir = isMobile ? VIEW_DIR_MOBILE : VIEW_DIR;
  const selectedGeom = selected ? LOTE_GEOMS_BY_CODIGO.get(selected) : undefined;
  const manzanaGeom =
    filters.manzana != null
      ? MANZANA_GEOMS.find((m) => m.numero === filters.manzana)
      : undefined;
  const cameraTarget = selectedGeom
    ? isMobile
      ? // Aim a little south of the lot so it shows above the bottom sheet.
        viewFrom([selectedGeom.centro[0], selectedGeom.centro[1] + 45], 190, dir)
      : viewFrom(selectedGeom.centro, 150, dir)
    : manzanaGeom
      ? viewFrom(manzanaGeom.centro, isMobile ? 260 : 160, dir)
      : viewFrom([0, 15], overviewDistance, dir);
  const cameraTargetKey = selectedGeom
    ? `lote-${selected}`
    : manzanaGeom
      ? `mz-${manzanaGeom.numero}`
      : `overview-${Math.round(overviewDistance / 40)}`;

  const unidadSeleccionada = selected ? (unidadesByCodigo.get(selected) ?? null) : null;
  const panelActive = hasPanelFilters(filters);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <Canvas
        camera={{
          position: viewFrom([0, 15], overviewDistance, dir).position,
          fov: FOV,
          near: 1,
          far: 3000,
        }}
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        shadows={!isMobile}
        frameloop={plano ? "never" : "always"}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        className={cn(hovered ? "cursor-pointer" : "")}
        onPointerMissed={() => setFiltersOpen(false)}
      >
        <LotesScene
          unidadesByCodigo={unidadesByCodigo}
          matches={matches}
          hovered={hovered}
          selected={selected}
          onHover={handleHover}
          onSelect={selectLote}
          cameraTarget={cameraTarget}
          cameraTargetKey={cameraTargetKey}
          minDistance={40}
          maxDistance={overviewDistance * 1.6}
          isMobile={isMobile}
          autoRotate={!reducedMotion && !isMobile && !selected}
          fogNear={overviewDistance * 0.9}
          fogFar={overviewDistance * 2.6}
          hideLabels={plano}
        />
      </Canvas>

      {plano ? (
        <div
          ref={(el) => {
            // On phones the plan is larger than the screen: start centred.
            if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
          }}
          className="absolute inset-0 overflow-auto bg-[#cdd9ad] pt-36 pb-28 sm:overflow-hidden sm:pt-4 sm:pb-20"
        >
          <div className="h-[760px] w-[680px] sm:h-full sm:w-full">
            <LotesPlano
              unidadesByCodigo={unidadesByCodigo}
              matches={matches}
              hovered={hovered}
              selected={selected}
              onHover={handleHover}
              onSelect={selectLote}
            />
          </div>
        </div>
      ) : null}

      {capturing ? null : (
        <>
          {/* Counter and legend */}
          <div className="pointer-events-none absolute left-4 top-16 rounded-2xl border border-border-subtle bg-background/85 px-4 py-3 backdrop-blur-md sm:left-6 sm:top-20">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent-strong">
              {LOTES_PROJECT_NAME}
            </p>
            <p className="mt-1 text-sm font-medium">
              {disponibles} {disponibles === 1 ? "lote disponible" : "lotes disponibles"}
              <span className="font-normal text-foreground-muted">
                {" "}
                de {matches.size}
              </span>
            </p>
            <div className="mt-1.5 flex gap-3 text-[11px] text-foreground-muted">
              {STATUS_ORDER.map((s) => (
                <span key={s} className="inline-flex items-center gap-1">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[s] }}
                  />
                  {STATUS_LABELS[s]}
                </span>
              ))}
            </div>
          </div>

          {/* View toggle and filters */}
          <div
            className={cn(
              "pointer-events-none absolute right-4 top-4 flex flex-col items-end gap-2 sm:right-6 sm:top-6",
              unidadSeleccionada && "sm:right-[25.5rem]"
            )}
          >
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPlano((p) => !p)}
                aria-pressed={plano}
                className={cn(pillClasses, plano && "border-accent text-accent-strong")}
              >
                {plano ? "Ver 3D" : "Ver plano"}
              </button>
              <button
                type="button"
                onClick={() => setFiltersOpen((o) => !o)}
                aria-expanded={filtersOpen}
                className={cn(
                  pillClasses,
                  panelActive && "border-accent text-accent-strong"
                )}
              >
                Filtros{panelActive ? " ·" : ""}
              </button>
            </div>

            {filtersOpen ? (
              <div className="pointer-events-auto w-64 space-y-3 rounded-2xl border border-border-subtle bg-background/95 p-4 backdrop-blur-md">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-foreground-muted">
                    Superficie
                  </span>
                  <select
                    className={selectClasses}
                    value={filters.superficie ?? ""}
                    onChange={(e) =>
                      updateFilters({
                        ...filters,
                        superficie: (e.target.value || null) as RangoSuperficie | null,
                      })
                    }
                  >
                    <option value="">Cualquiera</option>
                    {RANGOS_SUPERFICIE.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-foreground-muted">
                    Precio máximo
                  </span>
                  <select
                    className={selectClasses}
                    value={filters.precioMax ?? ""}
                    onChange={(e) =>
                      updateFilters({
                        ...filters,
                        precioMax: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  >
                    <option value="">Cualquiera</option>
                    {PRECIOS_MAX.map((p) => (
                      <option key={p} value={p}>
                        Hasta USD {p.toLocaleString("es-AR")}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-foreground-muted">
                    Orientación del frente
                  </span>
                  <select
                    className={selectClasses}
                    value={filters.orientacion ?? ""}
                    onChange={(e) =>
                      updateFilters({ ...filters, orientacion: e.target.value || null })
                    }
                  >
                    <option value="">Cualquiera</option>
                    {ORIENTACIONES.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.frenteLaguna}
                    onChange={(e) =>
                      updateFilters({ ...filters, frenteLaguna: e.target.checked })
                    }
                    className="h-4 w-4 accent-accent"
                  />
                  Frente a la laguna
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.soloDisponibles}
                    onChange={(e) =>
                      updateFilters({ ...filters, soloDisponibles: e.target.checked })
                    }
                    className="h-4 w-4 accent-accent"
                  />
                  Solo disponibles
                </label>
                {panelActive ? (
                  <button
                    type="button"
                    onClick={() =>
                      updateFilters({ ...EMPTY_LOTE_FILTERS, manzana: filters.manzana })
                    }
                    className="w-full rounded-full border border-border-subtle py-1.5 text-xs font-medium transition-colors duration-200 hover:border-accent hover:text-accent-strong"
                  >
                    Limpiar filtros
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Manzana chips and disclaimer */}
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-4 flex flex-col gap-2 px-4 sm:bottom-6 sm:px-6",
              unidadSeleccionada && "sm:pr-[25.5rem]"
            )}
          >
            <p className="pointer-events-auto self-start rounded-full bg-background/80 px-3 py-1 text-[11px] text-foreground-muted backdrop-blur-md">
              Barrio ficticio. Datos e imágenes ilustrativos.
            </p>
            <div
              role="group"
              aria-label="Manzanas"
              className="pointer-events-auto -mx-4 flex gap-2 overflow-x-auto pl-4 pr-20 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0"
            >
              {[null, ...MANZANA_GEOMS.map((m) => m.numero)].map((numero) => {
                const active = filters.manzana === numero;
                return (
                  <button
                    key={numero ?? "todas"}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      selectLote(null);
                      updateFilters({ ...filters, manzana: numero });
                    }}
                    className={cn(
                      "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium backdrop-blur-md transition-colors duration-200",
                      active
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border-subtle bg-background/85 hover:border-accent hover:text-accent-strong"
                    )}
                  >
                    {numero == null ? "Todas" : `Manzana ${numero}`}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {unidadSeleccionada ? (
        <div className="fixed inset-x-0 bottom-0 z-30 max-h-[60vh] sm:max-h-none overflow-y-auto rounded-t-2xl border-t border-border-subtle bg-background shadow-[0_-12px_40px_-20px_rgba(28,28,28,0.35)] sm:absolute sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-full sm:max-w-sm sm:rounded-none sm:border-l sm:border-t-0">
          <FichaUnidad
            key={unidadSeleccionada.codigo}
            unidad={unidadSeleccionada}
            proyectoSlug={LOTES_PROJECT_SLUG}
            proyectoNombre={LOTES_PROJECT_NAME}
            source="lotes-unidad"
            onClose={() => selectLote(null)}
            nota="Barrio ficticio. Datos e imágenes ilustrativos."
          />
        </div>
      ) : null}
    </div>
  );
}
