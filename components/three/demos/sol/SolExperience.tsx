"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import type { Project } from "@/db/schema";
import { defaultBuildingConfig, totalBuildingHeight } from "@/lib/three/building-config";
import type { Viewpoint } from "@/components/three/demos/maqueta/CameraRig";
import { NightProvider } from "@/components/three/demos/maqueta/night-context";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import {
  buenosAiresDate,
  civilDateKey,
  formatCivilDate,
  getSunPosition,
  getSunTimes,
  todayInBuenosAires,
  type CivilDate,
} from "@/lib/sun/sun-position";
import { useSunHours } from "@/lib/sun/use-sun-hours";
import { sunHoursToColor } from "@/lib/sun/color-scale";
import { trackUnitOpened } from "@/lib/analytics";
import { useCaptureMode } from "@/lib/hooks/use-capture-mode";
import { SolScene } from "./SolScene";
import { TimeControls, getDatePresets } from "./TimeControls";
import { SolarMapLegend } from "./SolarMapLegend";
import { SunDetailPanel } from "./SunDetailPanel";

const config = defaultBuildingConfig;
const PLAYBACK_DURATION_MS = 10_000;
const PLAYBACK_START_HOUR = 6;
const PLAYBACK_END_HOUR = 21;

function overviewViewpoint(): Viewpoint {
  const height = totalBuildingHeight(config);
  return {
    position: [config.buildingWidth * 0.95, height * 1.1, config.buildingDepth * 1.3],
    target: [0, height * 0.35, 0],
  };
}

type FetchState = { status: "loading" } | { status: "error" } | { status: "ready"; project: Project };

export function SolExperience({ projectSlug }: { projectSlug: string }) {
  const isMobile = useIsMobile();
  const captureMode = useCaptureMode();
  const maxDpr = isMobile ? 1.5 : 2;
  const [dpr, setDpr] = useState(maxDpr);
  const [state, setState] = useState<FetchState>({ status: "loading" });

  const [today] = useState<CivilDate>(() => todayInBuenosAires());
  const [civilDate, setCivilDate] = useState<CivilDate>(today);
  const [hour, setHour] = useState(12);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mapaDeSol, setMapaDeSol] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${projectSlug}/units`)
      .then((res) => {
        if (!res.ok) throw new Error("fetch_failed");
        return res.json();
      })
      .then((data: { project: Project }) => {
        if (!cancelled) setState({ status: "ready", project: data.project });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [projectSlug]);

  const lat = state.status === "ready" ? (state.project.latitude ?? -34.5755) : -34.5755;
  const lng = state.status === "ready" ? (state.project.longitude ?? -58.4338) : -58.4338;

  const { cache: sunHoursCache, requestDate } = useSunHours(lat, lng);

  const datePresets = useMemo(() => getDatePresets(today.year), [today.year]);
  const veranoDate = datePresets[0].date;
  const inviernoDate = datePresets[2].date;

  useEffect(() => {
    requestDate(civilDate);
    requestDate(veranoDate);
    requestDate(inviernoDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [civilDate, requestDate]);

  // Playback: sweep the hour slider over ~10s (longer, cinematic loop while capturing).
  useEffect(() => {
    if (!isPlaying) return;
    const duration = captureMode.active ? 13_000 : PLAYBACK_DURATION_MS;
    let raf = 0;
    let lastUpdate = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      if (now - lastUpdate > 60) {
        setHour(PLAYBACK_START_HOUR + progress * (PLAYBACK_END_HOUR - PLAYBACK_START_HOUR));
        lastUpdate = now;
      }
      if (progress >= 1) {
        setIsPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, captureMode.active]);

  // Scripted capture sequence: winter solstice time-lapse, looping, with a slow orbit.
  useEffect(() => {
    if (!captureMode.active) return;
    const id = setTimeout(() => setCivilDate(inviernoDate), 0);
    return () => clearTimeout(id);
  }, [captureMode.active, inviernoDate]);

  useEffect(() => {
    if (!captureMode.active || isPlaying) return;
    const timer = setTimeout(() => setIsPlaying(true), 500);
    return () => clearTimeout(timer);
  }, [captureMode.active, isPlaying]);

  const sunPosition = useMemo(
    () => getSunPosition(buenosAiresDate(civilDate, hour), lat, lng),
    [civilDate, hour, lat, lng],
  );

  const sunTimes = useMemo(() => getSunTimes(civilDate, lat, lng), [civilDate, lat, lng]);

  const currentDateKey = civilDateKey(civilDate);
  const currentHours = sunHoursCache[currentDateKey] ?? null;

  const apartmentColors = useMemo(() => {
    if (!mapaDeSol || !currentHours) return undefined;
    const colors: Record<string, string> = {};
    for (const [unitId, hours] of Object.entries(currentHours)) {
      colors[unitId] = sunHoursToColor(hours);
    }
    return colors;
  }, [mapaDeSol, currentHours]);

  const handleApartmentClick = useCallback((id: string) => {
    setSelectedId(id);
    trackUnitOpened("sol", id);
  }, []);

  const handleApartmentPointerOver = useCallback((id: string) => {
    setHoveredId(id);
  }, []);

  const handleApartmentPointerOut = useCallback(() => {
    setHoveredId(null);
  }, []);

  if (state.status === "error") {
    return (
      <div className="flex h-[100svh] w-full flex-col items-center justify-center gap-3 bg-background bg-grid px-6 text-center">
        <p className="font-display text-2xl">No pudimos cargar el proyecto</p>
        <p className="max-w-sm text-sm text-foreground-muted">
          Probá recargar la página en unos segundos.
        </p>
      </div>
    );
  }

  const viewpoint = overviewViewpoint();

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: viewpoint.position, fov: 42, near: 0.1, far: 500 }}
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
          <SolScene
            config={config}
            sunPosition={sunPosition}
            cameraTarget={viewpoint}
            cameraTargetKey="fixed"
            isMobile={isMobile}
            minDistance={Math.max(config.buildingWidth, config.buildingDepth) * 0.5}
            maxDistance={Math.max(config.buildingWidth, config.buildingDepth) * 4}
            autoRotateEnabled={captureMode.active}
            apartmentColors={apartmentColors}
            hoveredId={hoveredId}
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
            Cargando estudio de asoleamiento…
          </p>
        </div>
      ) : captureMode.active ? null : (
        <>
          {mapaDeSol ? <SolarMapLegend /> : null}

          {selectedId ? (
            <SunDetailPanel
              unitCode={selectedId}
              dateLabel={formatCivilDate(civilDate)}
              hoursForDate={currentHours?.[selectedId] ?? null}
              hoursVerano={sunHoursCache[civilDateKey(veranoDate)]?.[selectedId] ?? null}
              hoursInvierno={sunHoursCache[civilDateKey(inviernoDate)]?.[selectedId] ?? null}
              onClose={() => setSelectedId(null)}
            />
          ) : null}

          <TimeControls
            civilDate={civilDate}
            hour={hour}
            isPlaying={isPlaying}
            sunrise={sunTimes.sunrise}
            sunset={sunTimes.sunset}
            onHourChange={(h) => {
              setIsPlaying(false);
              setHour(h);
            }}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            onSelectPreset={(date) => setCivilDate(date)}
            onSelectFreeDate={(date) => setCivilDate(date)}
            mapaDeSol={mapaDeSol}
            onToggleMapaDeSol={() => setMapaDeSol((m) => !m)}
            datePresets={datePresets}
          />
        </>
      )}
    </div>
  );
}
