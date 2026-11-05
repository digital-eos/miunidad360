"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { sphereFitDistance } from "@/lib/three/camera-framing";
import { useElementAspect } from "@/lib/hooks/use-element-aspect";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { BIM_SIZE, bimUnitsByName, floorLevels } from "@/lib/bim/dataset";
import { LAST_WEEK } from "@/lib/bim/calendar";
import { trackUnitOpened } from "@/lib/analytics";
import { CameraRig, type Viewpoint } from "@/components/three/demos/maqueta/CameraRig";
import { BimModel, type BimMode } from "./BimModel";
import { BimLighting } from "./BimLighting";
import { LoadingOverlay } from "./LoadingOverlay";
import { ModeSwitcher } from "./ModeSwitcher";
import { AvanceCalendar } from "./AvanceCalendar";
import { CutControls } from "./CutControls";
import { UnitPanel } from "./UnitPanel";
import { DatasetCredit } from "./DatasetCredit";

const FOV = 38;
const PLAY_INTERVAL_MS = 450;

function useBimCamera(
  containerRef: RefObject<HTMLDivElement | null>
): Viewpoint & { minDistance: number; maxDistance: number } {
  const aspect = useElementAspect(containerRef);

  return useMemo(() => {
    const halfW = BIM_SIZE.width / 2;
    const halfH = BIM_SIZE.height / 2;
    const halfD = BIM_SIZE.depth / 2;
    const sphereRadius = Math.sqrt(halfW * halfW + halfH * halfH + halfD * halfD);

    const elevation = (52 * Math.PI) / 180;
    const azimuth = (38 * Math.PI) / 180;
    const distance = Math.max(
      sphereFitDistance(sphereRadius, FOV, aspect),
      sphereRadius + 6
    );

    const position: [number, number, number] = [
      Math.cos(elevation) * Math.sin(azimuth) * distance,
      halfH * 0.4 + Math.sin(elevation) * distance,
      Math.cos(elevation) * Math.cos(azimuth) * distance,
    ];
    const target: [number, number, number] = [0, BIM_SIZE.height * 0.32, 0];

    return {
      position,
      target,
      minDistance: Math.max(halfW, halfD) + 3,
      maxDistance: distance * 1.6,
    };
  }, [aspect]);
}

type BimExperienceProps = {
  /** Mode shown on first render. Defaults to the standalone demo's "unidades". */
  initialMode?: BimMode;
  /** Cut-plane height (meters) shown on first render, only relevant to "corte" mode. */
  initialCutHeight?: number;
  modelUrl?: string;
  /** Pulses the "Unidades" tab once after a few seconds of no interaction. */
  enableIdleHint?: boolean;
  modeSwitcherTopClassName?: string;
  /** Static image shown instantly behind the loading state, before the 3D scene is ready. */
  posterSrc?: string;
  /** Where the corte/avance bottom panel sits — "end" keeps it clear of a hero overlay on the left. */
  bottomPanelAlign?: "center" | "end";
  /** Keeps the unit panel inside this component's frame instead of the viewport. */
  containedPanel?: boolean;
};

export function BimExperience({
  initialMode = "unidades",
  initialCutHeight,
  modelUrl,
  enableIdleHint = false,
  modeSwitcherTopClassName,
  posterSrc,
  bottomPanelAlign = "center",
  containedPanel = false,
}: BimExperienceProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();
  const camera = useBimCamera(containerRef);
  const maxDpr = isMobile ? 1.5 : 2;
  const [dpr, setDpr] = useState(maxDpr);

  const [mode, setMode] = useState<BimMode>(initialMode);
  const [currentWeek, setCurrentWeek] = useState(LAST_WEEK);
  const [isPlaying, setIsPlaying] = useState(false);
  const [cutHeight, setCutHeight] = useState(initialCutHeight ?? BIM_SIZE.height * 0.6);
  const [hoveredUnit, setHoveredUnit] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [pulseMode, setPulseMode] = useState<BimMode | null>(null);

  const lastInteractionRef = useRef<number | null>(null);
  const hasPulsedRef = useRef(false);
  const markInteraction = useCallback(() => {
    lastInteractionRef.current = Date.now();
  }, []);

  useEffect(() => {
    markInteraction();
  }, [markInteraction]);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setCurrentWeek((w) => {
        if (w >= LAST_WEEK) {
          setIsPlaying(false);
          return w;
        }
        return w + 1;
      });
    }, PLAY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isPlaying]);

  useEffect(() => {
    if (!enableIdleHint || prefersReducedMotion) return;
    const id = setInterval(() => {
      if (hasPulsedRef.current || mode === "unidades") return;
      const last = lastInteractionRef.current;
      if (last === null || Date.now() - last < 4000) return;
      hasPulsedRef.current = true;
      setPulseMode("unidades");
      setTimeout(() => setPulseMode(null), 900);
    }, 500);
    return () => clearInterval(id);
  }, [enableIdleHint, prefersReducedMotion, mode]);

  const handleSelectMode = useCallback(
    (next: BimMode) => {
      markInteraction();
      setMode(next);
      setIsPlaying(false);
      setSelectedUnit(null);
      setHoveredUnit(null);
    },
    [markInteraction]
  );

  const selectedUnitData = selectedUnit
    ? (bimUnitsByName.get(selectedUnit) ?? null)
    : null;

  const handleUnitClick = useCallback(
    (name: string) => {
      markInteraction();
      setSelectedUnit(name);
      trackUnitOpened("bim", name);
    },
    [markInteraction]
  );

  const handleChangeCutHeight = useCallback(
    (height: number) => {
      markInteraction();
      setCutHeight(height);
    },
    [markInteraction]
  );

  const handleChangeWeek = useCallback(
    (week: number) => {
      markInteraction();
      setIsPlaying(false);
      setCurrentWeek(week);
    },
    [markInteraction]
  );

  const handleTogglePlay = useCallback(() => {
    markInteraction();
    setIsPlaying((p) => !p);
  }, [markInteraction]);

  const handleCompleteBuild = useCallback(() => {
    markInteraction();
    setIsPlaying(false);
    setCurrentWeek(LAST_WEEK);
  }, [markInteraction]);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full ${hoveredUnit ? "cursor-pointer" : ""}`}
      onPointerDown={markInteraction}
      onWheel={markInteraction}
    >
      <Canvas
        camera={{ position: camera.position, fov: FOV, near: 0.1, far: 250 }}
        dpr={dpr}
        shadows={!isMobile}
        gl={{
          antialias: !isMobile,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
          localClippingEnabled: true,
        }}
      >
        <PerformanceMonitor
          bounds={() => [50, 58]}
          onDecline={() => setDpr((d) => Math.max(0.75, d - 0.25))}
          onIncline={() => setDpr((d) => Math.min(maxDpr, d + 0.25))}
        />
        <BimLighting />
        <Suspense fallback={null}>
          <BimModel
            mode={mode}
            currentWeek={currentWeek}
            cutHeight={cutHeight}
            hoveredUnit={hoveredUnit}
            selectedUnit={selectedUnit}
            onUnitHover={setHoveredUnit}
            onUnitClick={handleUnitClick}
            modelUrl={modelUrl}
          />
        </Suspense>
        <ContactShadows
          position={[0, 0.02, 0]}
          opacity={0.35}
          scale={Math.max(BIM_SIZE.width, BIM_SIZE.depth) * 1.7}
          blur={2.4}
          far={6}
          resolution={isMobile ? 512 : 1024}
        />
        <CameraRig
          target={camera}
          targetKey="overview"
          autoRotateEnabled={!prefersReducedMotion && !isMobile}
          autoRotateSpeed={0.3}
          minDistance={camera.minDistance}
          maxDistance={camera.maxDistance}
          onInteractionChange={(interacting) => {
            if (interacting) markInteraction();
          }}
        />
      </Canvas>

      <LoadingOverlay posterSrc={posterSrc} />

      <ModeSwitcher
        mode={mode}
        onSelectMode={handleSelectMode}
        pulseMode={pulseMode}
        topClassName={modeSwitcherTopClassName}
      />

      {mode === "avance" ? (
        <AvanceCalendar
          currentWeek={currentWeek}
          isPlaying={isPlaying}
          onChangeWeek={handleChangeWeek}
          onTogglePlay={handleTogglePlay}
          onCompleteBuild={handleCompleteBuild}
          align={bottomPanelAlign}
        />
      ) : null}

      {mode === "corte" ? (
        <CutControls
          cutHeight={cutHeight}
          maxHeight={BIM_SIZE.height}
          floorLevels={floorLevels}
          onChangeCutHeight={handleChangeCutHeight}
          align={bottomPanelAlign}
        />
      ) : null}

      {mode === "unidades" && selectedUnitData ? (
        <UnitPanel
          unit={selectedUnitData}
          onClose={() => setSelectedUnit(null)}
          contained={containedPanel}
        />
      ) : null}

      <DatasetCredit />
    </div>
  );
}
