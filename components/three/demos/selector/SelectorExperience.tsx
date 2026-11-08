"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import type { Project } from "@/db/schema";
import { useCaptureMode } from "@/lib/hooks/use-capture-mode";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { fetchUnidades } from "@/lib/unidades/fetch";
import { attrNumber, findUnidad, type Unidad } from "@/lib/unidades/types";
import { defaultBuildingConfig, totalBuildingHeight } from "@/lib/three/building-config";
import type { Viewpoint } from "@/components/three/CameraRig";
import { EMPTY_FILTERS, unitMatchesFilters, type UnitFilters } from "@/lib/units/filters";
import { STATUS_COLORS } from "@/lib/units/status-colors";
import { civilDateKey, solsticeDates, todayInBuenosAires } from "@/lib/sun/sun-position";
import { useSunHours } from "@/lib/sun/use-sun-hours";
import { trackFilterUsed, trackUnitOpened } from "@/lib/analytics";
import { SelectorScene } from "./SelectorScene";
import { FloorSelector } from "./FloorSelector";
import { UnitPin, UnitTooltip } from "./UnitTooltip";
import { EdificioInfoPanel } from "./EdificioInfoPanel";

const config = defaultBuildingConfig;

function floorCenterY(floor: number): number {
  return config.groundFloorHeight + (floor - 0.5) * config.floorHeight;
}

function overviewViewpoint(aspect: number): Viewpoint {
  const height = totalBuildingHeight(config);
  // Narrow (portrait) views step back so the whole tower fits.
  const back = aspect < 1 ? 2.3 : 1.7;
  return {
    position: [
      config.buildingWidth * 1.15 * back,
      height * 0.95 * back,
      config.buildingDepth * 2.1 * back,
    ],
    target: [0, height * 0.48, 0],
  };
}

function floorViewpoint(floor: number): Viewpoint {
  const y = floorCenterY(floor);
  return {
    position: [config.buildingWidth * 1.45, y + config.floorHeight * 7, config.buildingDepth * 2.45],
    target: [0, y, 0],
  };
}

const LETTER_QUADRANT: Record<string, [number, number]> = {
  A: [-1, -1],
  B: [1, -1],
  C: [-1, 1],
  D: [1, 1],
};

/** Looks at a unit from its own corner, a little above its floor. */
function unitViewpoint(unit: Unidad): Viewpoint {
  const y = floorCenterY(unitFloor(unit));
  const letter = (unit.objeto3d ?? unit.codigo).slice(-1);
  const [sx, sz] = LETTER_QUADRANT[letter] ?? [1, 1];
  const tx = sx * config.buildingWidth * 0.22;
  const tz = sz * config.buildingDepth * 0.22;
  return {
    position: [sx * config.buildingWidth * 1.7, y + config.floorHeight * 6, sz * config.buildingDepth * 2.3],
    target: [tx, y, tz],
  };
}

type FetchState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; project: Project; units: Unidad[] };

/** 3D id of an apartment in the procedural building ("P04-B"). */
function meshId(unit: Unidad): string {
  return unit.objeto3d ?? unit.codigo;
}

function unitFloor(unit: Unidad): number {
  return attrNumber(unit, "piso") ?? 1;
}

export function SelectorExperience({
  projectSlug,
  embedded = false,
  children,
}: {
  projectSlug: string;
  /**
   * Inside another page (the homepage's "El resultado" frame): framed layout, the URL is
   * left alone and the capture mode is off.
   */
  embedded?: boolean;
  /** Overlays drawn on the 3D view (back link, scroll cue). */
  children?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();
  const captureMode = useCaptureMode();
  const capturing = captureMode.active && !embedded;
  const maxDpr = isMobile ? 1.5 : 2;
  const [dpr, setDpr] = useState(maxDpr);
  const stageRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const [aspect, setAspect] = useState(1.6);

  const [state, setState] = useState<FetchState>({ status: "loading" });
  const [filters, setFilters] = useState<UnitFilters>(EMPTY_FILTERS);
  const [focusFloor, setFocusFloor] = useState<number | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [hovered, setHovered] = useState<{ code: string; x: number; y: number } | null>(null);
  const [listHover, setListHover] = useState<string | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const unitsRef = useRef<Unidad[]>([]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setAspect(width / height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchUnidades(projectSlug)
      .then((data) => {
        if (cancelled) return;
        setState({ status: "ready", project: data.project, units: data.unidades });

        const unit = embedded ? null : findUnidad(data.unidades, searchParams.get("unidad"));
        if (unit) {
          setSelectedCode(unit.codigo);
          setFocusFloor(unitFloor(unit));
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectSlug]);

  const updateUrl = useCallback(
    (code: string | null) => {
      if (embedded) return;
      const params = new URLSearchParams(searchParams.toString());
      if (code) params.set("unidad", code);
      else params.delete("unidad");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [embedded, pathname, router, searchParams],
  );

  const handleSelectUnit = useCallback(
    (code: string | null) => {
      setSelectedCode(code);
      updateUrl(code);
      if (!code) return;
      const unit = unitsRef.current.find((u) => u.codigo === code);
      if (unit) setFocusFloor(unitFloor(unit));
      trackUnitOpened("selector", code);
    },
    [updateUrl],
  );

  const handleSelectFloor = useCallback(
    (floor: number | null) => {
      setFocusFloor(floor);
      const current = unitsRef.current.find((u) => u.codigo === selectedCode);
      if (current && floor !== unitFloor(current)) handleSelectUnit(null);
    },
    [selectedCode, handleSelectUnit],
  );

  const handleFiltersChange = useCallback((next: UnitFilters) => {
    setFilters(next);
    trackFilterUsed("selector");
  }, []);

  const handleApartmentClick = useCallback(
    (id: string) => {
      const unit = unitsRef.current.find((u) => meshId(u) === id);
      if (unit) handleSelectUnit(unit.codigo);
    },
    [handleSelectUnit],
  );

  const handleApartmentPointerOver = useCallback(
    (code: string, event: ThreeEvent<PointerEvent>) => {
      setHovered({ code, x: event.clientX, y: event.clientY });
    },
    [],
  );

  const handleApartmentPointerOut = useCallback(() => {
    setHovered(null);
  }, []);

  const units = useMemo(() => (state.status === "ready" ? state.units : []), [state]);
  useEffect(() => {
    unitsRef.current = units;
  }, [units]);

  // Scripted capture sequence: colored overview, isolate a floor, open a unit card.
  const captureCycleRef = useRef(0);
  useEffect(() => {
    if (!capturing || state.status !== "ready" || units.length === 0) return;

    const floor = Math.ceil(config.floors / 2);
    const targetUnit =
      units.find((u) => unitFloor(u) === floor && u.estado === "disponible") ??
      units.find((u) => unitFloor(u) === floor) ??
      null;

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const cycleId = ++captureCycleRef.current;

    function runCycle() {
      if (cancelled || captureCycleRef.current !== cycleId) return;
      handleSelectUnit(null);
      setFocusFloor(null);
      timers.push(
        setTimeout(() => {
          if (!cancelled) setFocusFloor(floor);
        }, 4000),
      );
      timers.push(
        setTimeout(() => {
          if (!cancelled && targetUnit) handleSelectUnit(targetUnit.codigo);
        }, 8000),
      );
      timers.push(setTimeout(runCycle, 13000));
    }

    runCycle();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturing, state.status, units]);

  const lat = state.status === "ready" ? (state.project.latitude ?? -34.5755) : -34.5755;
  const lng = state.status === "ready" ? (state.project.longitude ?? -58.4338) : -58.4338;
  const { cache: sunHoursCache, requestDate } = useSunHours(lat, lng);
  const { verano, invierno } = useMemo(() => solsticeDates(todayInBuenosAires().year), []);

  useEffect(() => {
    if (state.status !== "ready") return;
    requestDate(verano);
    requestDate(invierno);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, verano, invierno]);

  const apartmentColors = useMemo(() => {
    const colors: Record<string, string> = {};
    for (const unit of units) colors[meshId(unit)] = STATUS_COLORS[unit.estado];
    return colors;
  }, [units]);

  const dimmedIds = useMemo(
    () => new Set(units.filter((u) => !unitMatchesFilters(u, filters)).map(meshId)),
    [units, filters],
  );

  const orientations = useMemo(
    () =>
      Array.from(
        new Set(units.map((u) => u.orientacion).filter((o): o is string => Boolean(o))),
      ).sort(),
    [units],
  );

  const selectedUnit = useMemo(
    () => units.find((u) => u.codigo === selectedCode) ?? null,
    [units, selectedCode],
  );

  const hoveredUnit = useMemo(
    () => (hovered ? (units.find((u) => meshId(u) === hovered.code) ?? null) : null),
    [units, hovered],
  );

  const listHoverMeshId = useMemo(() => {
    const unit = listHover ? units.find((u) => u.codigo === listHover) : null;
    return unit ? meshId(unit) : null;
  }, [units, listHover]);

  const cameraTarget = selectedUnit
    ? unitViewpoint(selectedUnit)
    : focusFloor != null
      ? floorViewpoint(focusFloor)
      : overviewViewpoint(aspect);
  const cameraTargetKey = selectedUnit
    ? `unit-${selectedUnit.codigo}`
    : focusFloor != null
      ? `floor-${focusFloor}`
      : `overview-${aspect < 1 ? "narrow" : "wide"}`;

  if (state.status === "error") {
    return (
      <div className="flex h-[100svh] w-full flex-col items-center justify-center gap-3 bg-background bg-grid px-6 text-center">
        <p className="font-display text-2xl">No pudimos cargar las unidades</p>
        <p className="max-w-sm text-sm text-foreground-muted">
          Probá recargar la página en unos segundos.
        </p>
      </div>
    );
  }

  const ready = state.status === "ready";
  const span = Math.max(config.buildingWidth, config.buildingDepth);

  const stage = (
    <div
      ref={stageRef}
      className={cn("relative h-full w-full", hovered ? "cursor-pointer" : "")}
    >
      <Canvas
        camera={{ position: overviewViewpoint(aspect).position, fov: 40, near: 0.5, far: 600 }}
        dpr={dpr}
        shadows={!isMobile}
        gl={{
          antialias: !isMobile,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
      >
        <PerformanceMonitor
          bounds={() => [50, 58]}
          onDecline={() => setDpr((d) => Math.max(0.75, d - 0.25))}
          onIncline={() => setDpr((d) => Math.min(maxDpr, d + 0.25))}
        />
        <SelectorScene
          config={config}
          cameraTarget={cameraTarget}
          cameraTargetKey={cameraTargetKey}
          isMobile={isMobile}
          autoRotate={!prefersReducedMotion && !isMobile && !selectedUnit && !capturing}
          minDistance={span * 0.75}
          maxDistance={span * 5.5}
          apartmentColors={apartmentColors}
          dimmedIds={dimmedIds}
          showStatus={false}
          focusFloor={focusFloor}
          hoveredId={hovered?.code ?? listHoverMeshId}
          selectedId={selectedUnit ? meshId(selectedUnit) : null}
          pinRef={pinRef}
          onApartmentClick={handleApartmentClick}
          onApartmentPointerOver={handleApartmentPointerOver}
          onApartmentPointerOut={handleApartmentPointerOut}
          onReady={() => setSceneReady(true)}
        />
      </Canvas>

      {/* Moved over the selected unit every frame by the scene. */}
      <div
        ref={pinRef}
        className="pointer-events-none invisible absolute top-0 left-0 z-[5]"
      >
        {selectedUnit ? <UnitPin unit={selectedUnit} /> : null}
      </div>

      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background transition-opacity duration-700",
          ready && sceneReady ? "opacity-0" : "opacity-100",
        )}
      >
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-strong">
          Edificio Demo
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground-muted">
          {ready ? "Preparando el modelo 3D…" : "Cargando unidades…"}
        </p>
      </div>

      {ready && !capturing ? (
        <>
          <FloorSelector
            floors={config.floors}
            activeFloor={focusFloor}
            onSelectFloor={handleSelectFloor}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center bg-gradient-to-t from-background/90 to-transparent px-3 pb-2 pt-6">
            <p className="text-center font-mono text-[9px] uppercase tracking-[0.1em] text-foreground-muted/80 sm:text-[10px]">
              Edificio Demo: proyecto ficticio · modelo 3D, precios y estados ilustrativos
            </p>
          </div>
        </>
      ) : null}

      {hoveredUnit && hoveredUnit !== selectedUnit && !isMobile ? (
        <UnitTooltip unit={hoveredUnit} x={hovered!.x} y={hovered!.y} />
      ) : null}

      {children}
    </div>
  );

  if (capturing) return stage;

  return (
    <div
      className={
        embedded
          ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]"
          : "flex flex-col lg:h-[100svh] lg:flex-row"
      }
    >
      <div
        className={
          embedded
            ? "relative h-[65vh] w-full overflow-hidden rounded-2xl border border-border-subtle bg-background-elevated lg:h-[70vh]"
            : "relative h-[70svh] w-full lg:h-full lg:flex-1"
        }
      >
        {stage}
      </div>
      <EdificioInfoPanel
        projectName={ready ? state.project.name : "Edificio Demo"}
        projectAddress={ready ? state.project.address : null}
        projectSlug={projectSlug}
        units={units}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        orientations={orientations}
        focusFloor={focusFloor}
        selectedUnit={selectedUnit}
        onSelectUnit={handleSelectUnit}
        onHoverUnit={setListHover}
        sunHoursVerano={
          selectedUnit
            ? (sunHoursCache[civilDateKey(verano)]?.[meshId(selectedUnit)] ?? null)
            : null
        }
        sunHoursInvierno={
          selectedUnit
            ? (sunHoursCache[civilDateKey(invierno)]?.[meshId(selectedUnit)] ?? null)
            : null
        }
        className={
          embedded
            ? "h-[70vh] rounded-2xl border border-border-subtle"
            : "border-t border-border-subtle lg:h-full lg:w-[400px] lg:border-t-0 lg:border-l"
        }
      />
    </div>
  );
}
