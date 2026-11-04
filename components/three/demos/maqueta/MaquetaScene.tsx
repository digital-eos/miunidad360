"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { defaultBuildingConfig } from "@/lib/three/building-config";
import { computeMaquetaViewpoints, maquetaOrbitDistanceBounds } from "@/lib/three/camera-framing";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { useViewportAspect } from "@/lib/hooks/use-viewport-aspect";
import { useCaptureMode } from "@/lib/hooks/use-capture-mode";
import { Scene } from "./Scene";
import { ControlsPanel } from "./ControlsPanel";
import { LoadingOverlay } from "./LoadingOverlay";
import { NightProvider, requestNightTransition, useNightContext } from "./night-context";
import type { ViewpointId } from "./CameraRig";

const config = defaultBuildingConfig;
const CAMERA_FOV = 42;

const CAPTURE_NIGHT_AT_MS = 7000;
const CAPTURE_CYCLE_MS = 13000;

function MaquetaSceneInner() {
  const nightCtx = useNightContext();
  const prefersReducedMotion = usePrefersReducedMotion();
  const isMobile = useIsMobile();
  const aspect = useViewportAspect();
  const capture = useCaptureMode();

  const [isNight, setIsNight] = useState(false);
  const [activeViewpoint, setActiveViewpoint] = useState<ViewpointId>("aerial");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const maxDpr = isMobile ? 1.5 : 2;
  const [dpr, setDpr] = useState(maxDpr);

  // Scripted capture sequence: aerial establishing rotation, then dusk + window lights.
  useEffect(() => {
    if (!capture.active) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function runCycle() {
      if (cancelled) return;
      setActiveViewpoint("aerial");
      setIsNight(false);
      requestNightTransition(nightCtx, false);
      timers.push(
        setTimeout(() => {
          if (!cancelled) {
            setIsNight(true);
            requestNightTransition(nightCtx, true);
          }
        }, CAPTURE_NIGHT_AT_MS),
      );
      timers.push(setTimeout(runCycle, CAPTURE_CYCLE_MS));
    }

    runCycle();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capture.active]);

  const viewpoints = useMemo(
    () => computeMaquetaViewpoints(config, CAMERA_FOV, aspect),
    [aspect],
  );
  const { minDistance, maxDistance } = useMemo(
    () => maquetaOrbitDistanceBounds(config, viewpoints),
    [viewpoints],
  );

  const handleToggleNight = () => {
    const next = !isNight;
    setIsNight(next);
    requestNightTransition(nightCtx, next);
  };

  return (
    <div className={`relative h-full w-full ${hoveredId ? "cursor-pointer" : ""}`}>
      <Canvas
        camera={{ position: viewpoints.aerial.position, fov: CAMERA_FOV, near: 0.1, far: 500 }}
        dpr={dpr}
        shadows={!isMobile}
        frameloop={!capture.active && prefersReducedMotion ? "demand" : "always"}
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
        <Scene
          config={config}
          cameraTarget={viewpoints[activeViewpoint]}
          cameraTargetKey={activeViewpoint}
          autoRotateEnabled={capture.active || !prefersReducedMotion}
          autoRotateSpeed={capture.active ? 2.4 : 0.55}
          isMobile={isMobile}
          minDistance={minDistance}
          maxDistance={maxDistance}
          hoveredId={hoveredId}
          onApartmentPointerOver={setHoveredId}
          onApartmentPointerOut={() => setHoveredId(null)}
        />
      </Canvas>

      <LoadingOverlay />
      {!capture.active ? (
        <ControlsPanel
          isNight={isNight}
          onToggleNight={handleToggleNight}
          activeViewpoint={activeViewpoint}
          onSelectViewpoint={setActiveViewpoint}
        />
      ) : null}
    </div>
  );
}

export default function MaquetaScene() {
  return (
    <NightProvider>
      <MaquetaSceneInner />
    </NightProvider>
  );
}
