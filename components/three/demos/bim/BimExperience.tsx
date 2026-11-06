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
import { BIM_SIZE } from "@/lib/bim/dataset";
import { RENDER_IMAGE } from "@/lib/bim/render-camera";
import { cn } from "@/lib/utils";
import { floorMidHeight, floorRange } from "@/lib/bim/floors";
import { CameraRig, type Viewpoint } from "@/components/three/demos/maqueta/CameraRig";
import { BimModel, type BimMode } from "./BimModel";
import { PostFX } from "@/components/three/visual/PostFX";
import { BimLighting } from "./BimLighting";
import { BimNeighborhood, GROUND_Y } from "./BimNeighborhood";
import { LoadingOverlay } from "./LoadingOverlay";
import { ModeSwitcher } from "./ModeSwitcher";
import { DatasetCredit } from "./DatasetCredit";
import { RenderIntroCamera } from "./RenderIntroCamera";
import type { BimViewer } from "./use-bim-viewer";

const FOV = 38;

// Homepage intro: the studio render, shown over the canvas from its own viewpoint, fades
// into the live 3D; only then does the camera move to the usual view.
type IntroPhase = "hold" | "fade" | "glide" | "done";
/** Still frame before the fade, once the model is drawn and the frame is on screen. */
const INTRO_HOLD_MS = 600;
const INTRO_FADE_MS = 1200;
const INTRO_FADE_REDUCED_MS = 300;

/** Calls onReady once the suspended model above it has mounted and drawn a frame. */
function OnModelReady({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(onReady);
    });
    return () => cancelAnimationFrame(id);
  }, [onReady]);
  return null;
}

/** True once at least 40% of the element has been on screen. */
function useSeenOnScreen(ref: RefObject<Element | null>, enabled: boolean) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!enabled || seen || !el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setSeen(true);
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, enabled, seen]);
  return seen;
}

function useBimCamera(
  containerRef: RefObject<HTMLDivElement | null>
): Viewpoint & { distance: number; minDistance: number; maxDistance: number } {
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
      distance,
      minDistance: Math.max(halfW, halfD) + 3,
      maxDistance: distance * 1.6,
    };
  }, [aspect]);
}

type BimExperienceProps = {
  /** Shared mode / floor / unit state, also read by the info card beside the 3D view. */
  viewer: BimViewer;
  modelUrl?: string;
  /** Pulses the "Unidades" tab once after a few seconds of no interaction. */
  enableIdleHint?: boolean;
  modeSwitcherTopClassName?: string;
  /** Static image shown instantly behind the loading state, before the 3D scene is ready. */
  posterSrc?: string;
  posterMobileSrc?: string;
  /** Homepage: open on the studio render, fade it into the 3D, then fly to the usual view. */
  renderIntro?: boolean;
};

export function BimExperience({
  viewer,
  modelUrl,
  enableIdleHint = false,
  modeSwitcherTopClassName,
  posterSrc,
  posterMobileSrc,
  renderIntro = false,
}: BimExperienceProps) {
  const {
    mode,
    floor,
    selectedUnit,
    selectMode,
    selectFloor,
    openUnit,
    currentWeek,
    unidadesByObjeto,
  } = viewer;
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();
  const camera = useBimCamera(containerRef);
  const maxDpr = isMobile ? 1.5 : 2;
  const [dpr, setDpr] = useState(maxDpr);

  const [introPhase, setIntroPhase] = useState<IntroPhase>(renderIntro ? "hold" : "done");
  const [modelReady, setModelReady] = useState(false);
  const handleModelReady = useCallback(() => setModelReady(true), []);
  const frameSeen = useSeenOnScreen(containerRef, introPhase === "hold");
  const introActive = introPhase !== "done";
  const introFadeMs = prefersReducedMotion ? INTRO_FADE_REDUCED_MS : INTRO_FADE_MS;

  useEffect(() => {
    if (introPhase !== "hold" || !modelReady || !frameSeen) return;
    const id = setTimeout(() => setIntroPhase("fade"), INTRO_HOLD_MS);
    return () => clearTimeout(id);
  }, [introPhase, modelReady, frameSeen]);

  useEffect(() => {
    if (introPhase !== "fade") return;
    const id = setTimeout(
      () => setIntroPhase(prefersReducedMotion ? "done" : "glide"),
      introFadeMs
    );
    return () => clearTimeout(id);
  }, [introPhase, introFadeMs, prefersReducedMotion]);

  // Touching the scene while the camera flies in ends the intro on the spot.
  const finishGlide = useCallback(() => {
    setIntroPhase((p) => (p === "glide" ? "done" : p));
  }, []);
  const endIntro = useCallback(() => setIntroPhase("done"), []);

  const [hoveredUnit, setHoveredUnit] = useState<string | null>(null);
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
      selectMode(next);
      setHoveredUnit(null);
    },
    [markInteraction, selectMode]
  );

  const handleUnitClick = useCallback(
    (name: string) => {
      markInteraction();
      openUnit(name);
    },
    [markInteraction, openUnit]
  );

  const handleFloorClick = useCallback(
    (next: number) => {
      markInteraction();
      selectFloor(next);
    },
    [markInteraction, selectFloor]
  );

  const isolatedFloor = mode === "avance" ? null : floor;
  const range =
    isolatedFloor === null || mode === "avance" ? null : floorRange(isolatedFloor, mode);

  // Point the camera at the isolated floor, keeping the overview's angle and distance.
  const viewpoint: Viewpoint = useMemo(() => {
    const mid = isolatedFloor === null ? null : floorMidHeight(isolatedFloor);
    if (mid === null) return camera;
    // Same angle, a little closer, so the picked floor fills the frame.
    const zoom = 0.85;
    const [tx, , tz] = camera.target;
    const offset = camera.position.map((p, i) => (p - camera.target[i]) * zoom);
    return {
      position: [tx + offset[0], mid + offset[1], tz + offset[2]],
      target: [tx, mid, tz],
    };
  }, [camera, isolatedFloor]);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full ${hoveredUnit ? "cursor-pointer" : ""}`}
      onPointerDown={() => {
        markInteraction();
        finishGlide();
      }}
      onWheel={() => {
        markInteraction();
        finishGlide();
      }}
    >
      <Canvas
        camera={{ position: viewpoint.position, fov: FOV, near: 0.1, far: 250 }}
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
        <BimLighting highQuality={!isMobile} />
        <Suspense fallback={null}>
          <BimModel
            mode={mode}
            currentWeek={currentWeek}
            floorRange={range}
            isolatedFloor={isolatedFloor}
            hoveredUnit={hoveredUnit}
            selectedUnit={selectedUnit}
            unidadesByObjeto={unidadesByObjeto}
            onUnitHover={setHoveredUnit}
            onUnitClick={handleUnitClick}
            onFloorClick={handleFloorClick}
            tagFade={{ start: camera.distance * 1.1, end: camera.maxDistance }}
            reducedMotion={prefersReducedMotion}
            tagsHidden={introActive}
            modelUrl={modelUrl}
          />
          {renderIntro ? <OnModelReady onReady={handleModelReady} /> : null}
        </Suspense>
        <BimNeighborhood excavated={mode === "avance"} />
        <ContactShadows
          position={[0, mode === "avance" ? 0.02 : GROUND_Y + 0.02, 0]}
          opacity={0.35}
          scale={Math.max(BIM_SIZE.width, BIM_SIZE.depth) * 1.7}
          blur={2.4}
          far={6}
          resolution={isMobile ? 512 : 1024}
        />
        {/* Desktop only: mobile keeps the plain renderer (ACES set on gl above). */}
        {!isMobile ? <PostFX /> : null}
        {introActive ? (
          <RenderIntroCamera
            to={viewpoint}
            fov={FOV}
            gliding={introPhase === "glide"}
            onArrive={endIntro}
          />
        ) : (
          <CameraRig
            target={viewpoint}
            targetKey={`floor-${isolatedFloor ?? "all"}`}
            autoRotateEnabled={!prefersReducedMotion && !isMobile}
            autoRotateSpeed={0.3}
            minDistance={camera.minDistance}
            maxDistance={camera.maxDistance}
            onInteractionChange={(interacting) => {
              if (interacting) markInteraction();
            }}
          />
        )}
      </Canvas>

      {introPhase === "hold" || introPhase === "fade" ? (
        // Same crop as the intro projection (cover, centered); blocks the scene until it fades.
        <picture
          className="absolute inset-0 z-[5] block"
          style={{
            opacity: introPhase === "fade" ? 0 : 1,
            transition: `opacity ${introFadeMs}ms ease-out`,
          }}
        >
          <source media="(max-width: 767px)" srcSet={RENDER_IMAGE.srcMobile} />
          <img
            src={RENDER_IMAGE.src}
            alt="Render del estudio del proyecto Schependomlaan"
            className="h-full w-full object-cover object-center"
            draggable={false}
          />
        </picture>
      ) : null}

      <LoadingOverlay posterSrc={posterSrc} posterMobileSrc={posterMobileSrc} />

      <div
        className={cn(
          "transition-opacity duration-500",
          introActive && "pointer-events-none opacity-0"
        )}
        aria-hidden={introActive || undefined}
      >
        <ModeSwitcher
          mode={mode}
          onSelectMode={handleSelectMode}
          pulseMode={pulseMode}
          topClassName={modeSwitcherTopClassName}
        />
      </div>

      <DatasetCredit />
    </div>
  );
}
