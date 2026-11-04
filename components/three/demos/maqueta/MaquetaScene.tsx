"use client";

import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { defaultBuildingConfig, totalBuildingHeight } from "@/lib/three/building-config";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { Scene } from "./Scene";
import { ControlsPanel } from "./ControlsPanel";
import { LoadingOverlay } from "./LoadingOverlay";
import { NightProvider, requestNightTransition, useNightContext } from "./night-context";
import type { ViewpointId, Viewpoints } from "./CameraRig";

const config = defaultBuildingConfig;

function MaquetaSceneInner() {
  const nightCtx = useNightContext();
  const prefersReducedMotion = usePrefersReducedMotion();
  const isMobile = useIsMobile();

  const [isNight, setIsNight] = useState(false);
  const [activeViewpoint, setActiveViewpoint] = useState<ViewpointId>("aerial");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const height = useMemo(() => totalBuildingHeight(config), []);

  const viewpoints: Viewpoints = useMemo(
    () => ({
      aerial: {
        position: [config.buildingWidth * 0.95, height * 1.45, config.buildingDepth * 1.25],
        target: [0, height * 0.32, 0],
      },
      street: {
        position: [config.buildingWidth * 0.1, 3.4, config.buildingDepth * 0.92],
        target: [0, height * 0.22, 0],
      },
      facade: {
        position: [0, height * 0.5, height * 1.7],
        target: [0, height * 0.46, 0],
      },
    }),
    [height],
  );

  const handleToggleNight = () => {
    const next = !isNight;
    setIsNight(next);
    requestNightTransition(nightCtx, next);
  };

  return (
    <div className={`relative h-[100svh] w-full ${hoveredId ? "cursor-pointer" : ""}`}>
      <Canvas
        camera={{ position: viewpoints.aerial.position, fov: 42, near: 0.1, far: 400 }}
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        shadows={!isMobile}
        frameloop={prefersReducedMotion ? "demand" : "always"}
        gl={{
          antialias: !isMobile,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
      >
        <Scene
          config={config}
          cameraTarget={viewpoints[activeViewpoint]}
          cameraTargetKey={activeViewpoint}
          autoRotateEnabled={!prefersReducedMotion}
          isMobile={isMobile}
          minDistance={Math.max(config.buildingWidth, config.buildingDepth) * 0.45}
          maxDistance={Math.max(config.buildingWidth, config.buildingDepth) * 3.4}
          hoveredId={hoveredId}
          onApartmentPointerOver={setHoveredId}
          onApartmentPointerOut={() => setHoveredId(null)}
        />
      </Canvas>

      <LoadingOverlay />
      <ControlsPanel
        isNight={isNight}
        onToggleNight={handleToggleNight}
        activeViewpoint={activeViewpoint}
        onSelectViewpoint={setActiveViewpoint}
      />
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
