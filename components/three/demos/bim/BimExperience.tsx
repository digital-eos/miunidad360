"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { sphereFitDistance } from "@/lib/three/camera-framing";
import { useViewportAspect } from "@/lib/hooks/use-viewport-aspect";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { BIM_SIZE, bimUnitsByName, floorLevels, weekNumbers } from "@/lib/bim/dataset";
import { trackUnitOpened } from "@/lib/analytics";
import { CameraRig, type Viewpoint } from "@/components/three/demos/maqueta/CameraRig";
import { BimModel, type BimMode } from "./BimModel";
import { BimLighting } from "./BimLighting";
import { LoadingOverlay } from "./LoadingOverlay";
import { ModeSwitcher } from "./ModeSwitcher";
import { WeekControls } from "./WeekControls";
import { CutControls } from "./CutControls";
import { UnitPanel } from "./UnitPanel";
import { DatasetCredit } from "./DatasetCredit";

const FOV = 38;
const PLAY_INTERVAL_MS = 650;

function useBimCamera(): Viewpoint & { minDistance: number; maxDistance: number } {
  const aspect = useViewportAspect();

  return useMemo(() => {
    const halfW = BIM_SIZE.width / 2;
    const halfH = BIM_SIZE.height / 2;
    const halfD = BIM_SIZE.depth / 2;
    const sphereRadius = Math.sqrt(halfW * halfW + halfH * halfH + halfD * halfD);

    const elevation = (52 * Math.PI) / 180;
    const azimuth = (38 * Math.PI) / 180;
    const distance = Math.max(sphereFitDistance(sphereRadius, FOV, aspect), sphereRadius + 6);

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

export function BimExperience() {
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();
  const camera = useBimCamera();
  const maxDpr = isMobile ? 1.5 : 2;
  const [dpr, setDpr] = useState(maxDpr);

  const [mode, setMode] = useState<BimMode>("unidades");
  const [weekIndex, setWeekIndex] = useState(weekNumbers.length - 1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [cutHeight, setCutHeight] = useState(BIM_SIZE.height * 0.6);
  const [hoveredUnit, setHoveredUnit] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

  const currentWeek = weekNumbers[weekIndex] ?? 0;

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setWeekIndex((i) => {
        if (i >= weekNumbers.length - 1) {
          setIsPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, PLAY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isPlaying]);

  const handleSelectMode = useCallback((next: BimMode) => {
    setMode(next);
    setIsPlaying(false);
    setSelectedUnit(null);
    setHoveredUnit(null);
  }, []);

  const selectedUnitData = selectedUnit ? (bimUnitsByName.get(selectedUnit) ?? null) : null;

  const handleUnitClick = useCallback((name: string) => {
    setSelectedUnit(name);
    trackUnitOpened("bim", name);
  }, []);

  return (
    <div className={`relative h-full w-full ${hoveredUnit ? "cursor-pointer" : ""}`}>
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
          target={{ position: camera.position, target: camera.target }}
          targetKey="overview"
          autoRotateEnabled={!prefersReducedMotion && !isMobile}
          autoRotateSpeed={0.3}
          minDistance={camera.minDistance}
          maxDistance={camera.maxDistance}
        />
      </Canvas>

      <LoadingOverlay />

      <ModeSwitcher mode={mode} onSelectMode={handleSelectMode} />

      {mode === "avance" ? (
        <WeekControls
          weekIndex={weekIndex}
          weekCount={weekNumbers.length}
          currentWeek={currentWeek}
          isPlaying={isPlaying}
          onChangeIndex={(i) => {
            setIsPlaying(false);
            setWeekIndex(i);
          }}
          onTogglePlay={() => setIsPlaying((p) => !p)}
        />
      ) : null}

      {mode === "corte" ? (
        <CutControls
          cutHeight={cutHeight}
          maxHeight={BIM_SIZE.height}
          floorLevels={floorLevels}
          onChangeCutHeight={setCutHeight}
        />
      ) : null}

      {mode === "unidades" && selectedUnitData ? (
        <UnitPanel unit={selectedUnitData} onClose={() => setSelectedUnit(null)} />
      ) : null}

      <DatasetCredit />
    </div>
  );
}
