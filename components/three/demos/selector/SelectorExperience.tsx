"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCaptureMode } from "@/lib/hooks/use-capture-mode";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { Project, Unit } from "@/db/schema";
import { defaultBuildingConfig, totalBuildingHeight } from "@/lib/three/building-config";
import type { Viewpoint } from "@/components/three/demos/maqueta/CameraRig";
import { NightProvider } from "@/components/three/demos/maqueta/night-context";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { EMPTY_FILTERS, unitMatchesFilters, type UnitFilters } from "@/lib/units/filters";
import { STATUS_COLORS } from "@/lib/units/status-colors";
import { civilDateKey, solsticeDates, todayInBuenosAires } from "@/lib/sun/sun-position";
import { useSunHours } from "@/lib/sun/use-sun-hours";
import { trackFilterUsed, trackUnitOpened } from "@/lib/analytics";
import { SelectorScene } from "./SelectorScene";
import { LegendCounter } from "./LegendCounter";
import { FiltersPanel } from "./FiltersPanel";
import { FloorSelector } from "./FloorSelector";
import { UnitTooltip } from "./UnitTooltip";
import { UnitPanel } from "./UnitPanel";

const config = defaultBuildingConfig;
const FILTERED_OUT_OPACITY = 0.14;

function floorCenterY(floor: number): number {
  return config.groundFloorHeight + (floor - 0.5) * config.floorHeight;
}

function overviewViewpoint(): Viewpoint {
  const height = totalBuildingHeight(config);
  return {
    position: [config.buildingWidth * 0.85, height * 1.05, config.buildingDepth * 1.2],
    target: [0, height * 0.38, 0],
  };
}

function floorViewpoint(floor: number): Viewpoint {
  const y = floorCenterY(floor);
  return {
    position: [config.buildingWidth * 0.78, y + config.floorHeight * 1.7, config.buildingDepth * 1.0],
    target: [0, y, 0],
  };
}

/** Tighter framing used for the capture-mode "open a unit card" beat. */
function floorCloseupViewpoint(floor: number): Viewpoint {
  const y = floorCenterY(floor);
  return {
    position: [config.buildingWidth * 0.4, y + config.floorHeight * 0.9, config.buildingDepth * 0.55],
    target: [0, y, 0],
  };
}

type FetchState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; project: Project; units: Unit[] };

export function SelectorExperience({ projectSlug }: { projectSlug: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const captureMode = useCaptureMode();
  const maxDpr = isMobile ? 1.5 : 2;
  const [dpr, setDpr] = useState(maxDpr);

  const [state, setState] = useState<FetchState>({ status: "loading" });
  const [filters, setFilters] = useState<UnitFilters>(EMPTY_FILTERS);
  const [focusFloor, setFocusFloor] = useState<number | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [hovered, setHovered] = useState<{ code: string; x: number; y: number } | null>(null);
  const [captureCloseup, setCaptureCloseup] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${projectSlug}/units`)
      .then((res) => {
        if (!res.ok) throw new Error("fetch_failed");
        return res.json();
      })
      .then((data: { project: Project; units: Unit[] }) => {
        if (cancelled) return;
        setState({ status: "ready", project: data.project, units: data.units });

        const code = searchParams.get("unidad");
        if (code) {
          const unit = data.units.find((u) => u.code === code);
          if (unit) {
            setSelectedCode(unit.code);
            setFocusFloor(unit.floor);
          }
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
      const params = new URLSearchParams(searchParams.toString());
      if (code) params.set("unidad", code);
      else params.delete("unidad");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleSelectUnit = useCallback(
    (code: string | null) => {
      setSelectedCode(code);
      updateUrl(code);
      if (code) trackUnitOpened("selector", code);
    },
    [updateUrl],
  );

  const handleFiltersChange = useCallback((next: UnitFilters) => {
    setFilters(next);
    trackFilterUsed("selector");
  }, []);

  const handleApartmentClick = useCallback(
    (code: string) => {
      handleSelectUnit(code);
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

  // Scripted capture sequence: colored overview, isolate a floor, open a unit card.
  const captureCycleRef = useRef(0);
  useEffect(() => {
    if (!captureMode.active || state.status !== "ready" || units.length === 0) return;

    const floor = Math.ceil(config.floors / 2);
    const targetUnit =
      units.find((u) => u.floor === floor && u.status === "disponible") ??
      units.find((u) => u.floor === floor) ??
      null;

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const cycleId = ++captureCycleRef.current;

    function runCycle() {
      if (cancelled || captureCycleRef.current !== cycleId) return;
      setFocusFloor(null);
      setCaptureCloseup(false);
      handleSelectUnit(null);
      timers.push(
        setTimeout(() => {
          if (!cancelled) setFocusFloor(floor);
        }, 4000),
      );
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setCaptureCloseup(true);
          if (targetUnit) handleSelectUnit(targetUnit.code);
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
  }, [captureMode.active, state.status, units]);

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
    for (const unit of units) colors[unit.code] = STATUS_COLORS[unit.status];
    return colors;
  }, [units]);

  const apartmentOpacities = useMemo(() => {
    const opacities: Record<string, number> = {};
    for (const unit of units) {
      opacities[unit.code] = unitMatchesFilters(unit, filters) ? 1 : FILTERED_OUT_OPACITY;
    }
    return opacities;
  }, [units, filters]);

  const availableCount = useMemo(
    () => units.filter((u) => u.status === "disponible").length,
    [units],
  );

  const orientations = useMemo(
    () => Array.from(new Set(units.map((u) => u.orientation))).sort(),
    [units],
  );

  const selectedUnit = useMemo(
    () => units.find((u) => u.code === selectedCode) ?? null,
    [units, selectedCode],
  );

  const hoveredUnit = useMemo(
    () => (hovered ? (units.find((u) => u.code === hovered.code) ?? null) : null),
    [units, hovered],
  );

  const cameraTarget =
    focusFloor != null
      ? captureCloseup
        ? floorCloseupViewpoint(focusFloor)
        : floorViewpoint(focusFloor)
      : overviewViewpoint();
  const cameraTargetKey =
    focusFloor != null ? `floor-${focusFloor}${captureCloseup ? "-closeup" : ""}` : "overview";

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

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: overviewViewpoint().position, fov: 42, near: 0.1, far: 400 }}
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
        <NightProvider>
          <SelectorScene
            config={config}
            cameraTarget={cameraTarget}
            cameraTargetKey={cameraTargetKey}
            isMobile={isMobile}
            minDistance={Math.max(config.buildingWidth, config.buildingDepth) * 0.45}
            maxDistance={Math.max(config.buildingWidth, config.buildingDepth) * 3.4}
            apartmentColors={apartmentColors}
            apartmentOpacities={apartmentOpacities}
            focusFloor={focusFloor}
            hoveredId={hovered?.code ?? null}
            onApartmentClick={handleApartmentClick}
            onApartmentPointerOver={handleApartmentPointerOver}
            onApartmentPointerOut={handleApartmentPointerOut}
          />
        </NightProvider>
      </Canvas>

      {state.status === "loading" ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-strong">Edificio Demo</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground-muted">
            Cargando unidades…
          </p>
        </div>
      ) : (
        <>
          {!captureMode.active ? (
            <>
              <LegendCounter availableCount={availableCount} />
              <FiltersPanel
                filters={filters}
                onChange={handleFiltersChange}
                orientations={orientations}
              />
              <FloorSelector
                floors={config.floors}
                activeFloor={focusFloor}
                onSelectFloor={setFocusFloor}
              />
            </>
          ) : null}

          {hoveredUnit && !isMobile ? (
            <UnitTooltip unit={hoveredUnit} x={hovered!.x} y={hovered!.y} />
          ) : null}

          {selectedUnit ? (
            <UnitPanel
              unit={selectedUnit}
              projectSlug={projectSlug}
              onClose={() => handleSelectUnit(null)}
              sunHoursVerano={sunHoursCache[civilDateKey(verano)]?.[selectedUnit.code] ?? null}
              sunHoursInvierno={sunHoursCache[civilDateKey(invierno)]?.[selectedUnit.code] ?? null}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
