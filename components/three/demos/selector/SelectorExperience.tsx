"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { Project, Unit } from "@/db/schema";
import { defaultBuildingConfig, totalBuildingHeight } from "@/lib/three/building-config";
import type { Viewpoint } from "@/components/three/demos/maqueta/CameraRig";
import { NightProvider } from "@/components/three/demos/maqueta/night-context";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { EMPTY_FILTERS, unitMatchesFilters, type UnitFilters } from "@/lib/units/filters";
import { STATUS_COLORS } from "@/lib/units/status-colors";
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

type FetchState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; project: Project; units: Unit[] };

export function SelectorExperience({ projectSlug }: { projectSlug: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();

  const [state, setState] = useState<FetchState>({ status: "loading" });
  const [filters, setFilters] = useState<UnitFilters>(EMPTY_FILTERS);
  const [focusFloor, setFocusFloor] = useState<number | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [hovered, setHovered] = useState<{ code: string; x: number; y: number } | null>(null);

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
    },
    [updateUrl],
  );

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

  const cameraTarget = focusFloor != null ? floorViewpoint(focusFloor) : overviewViewpoint();
  const cameraTargetKey = focusFloor != null ? `floor-${focusFloor}` : "overview";

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
    <div className="relative h-[100svh] w-full">
      <Canvas
        camera={{ position: overviewViewpoint().position, fov: 42, near: 0.1, far: 400 }}
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        shadows={!isMobile}
        gl={{
          antialias: !isMobile,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
      >
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
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">Edificio Demo</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground-muted">
            Cargando unidades…
          </p>
        </div>
      ) : (
        <>
          <LegendCounter availableCount={availableCount} />
          <FiltersPanel filters={filters} onChange={setFilters} orientations={orientations} />
          <FloorSelector floors={config.floors} activeFloor={focusFloor} onSelectFloor={setFocusFloor} />

          {hoveredUnit && !isMobile ? (
            <UnitTooltip unit={hoveredUnit} x={hovered!.x} y={hovered!.y} />
          ) : null}

          {selectedUnit ? (
            <UnitPanel
              unit={selectedUnit}
              projectSlug={projectSlug}
              onClose={() => handleSelectUnit(null)}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
