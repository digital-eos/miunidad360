"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import type { Viewpoint } from "@/components/three/CameraRig";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { trackUnitOpened } from "@/lib/analytics";
import { PROYECTO, ROOMS, UNIDAD, type RoomId } from "@/lib/departamentos/cataluna-103";
import { DepartamentoScene, roomCenter } from "./DepartamentoScene";
import { DepartamentoPanel } from "./DepartamentoPanel";

function overviewViewpoint(aspect: number): Viewpoint {
  // Narrow (portrait) views step back so the whole unit fits.
  const back = aspect < 1 ? 1.55 : 1;
  return { position: [6.5 * back, 9.5 * back, 8.5 * back], target: [0, 0, 0.4] };
}

function roomViewpoint(id: RoomId): Viewpoint {
  const [x, z] = roomCenter(id);
  // Steep, from above: the 2.6 m walls would hide the room from a low angle.
  return { position: [x + 1.6, 8.2, z + 3.6], target: [x, 0.2, z] };
}

export function DepartamentoExperience({
  children,
  className,
}: {
  children?: ReactNode;
  /** Outer layout; defaults to a full-screen-height page section. */
  className?: string;
}) {
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();
  const maxDpr = isMobile ? 1.5 : 2;
  const [dpr, setDpr] = useState(maxDpr);
  const stageRef = useRef<HTMLDivElement>(null);
  const [aspect, setAspect] = useState(1.6);
  const [selectedRoom, setSelectedRoom] = useState<RoomId | null>(null);
  const [hoveredRoom, setHoveredRoom] = useState<RoomId | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const labelsRef = useRef<Partial<Record<RoomId, HTMLElement | null>>>({});

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

  const handleSelectRoom = useCallback((id: RoomId | null) => {
    setSelectedRoom(id);
    if (id) trackUnitOpened("departamento", `${UNIDAD.codigo}-${id}`);
  }, []);

  const cameraTarget = selectedRoom ? roomViewpoint(selectedRoom) : overviewViewpoint(aspect);
  const cameraTargetKey = selectedRoom
    ? `room-${selectedRoom}`
    : `overview-${aspect < 1 ? "narrow" : "wide"}`;

  return (
    <div className={className ?? "flex flex-col lg:h-[100svh] lg:flex-row"}>
      <div className="relative h-[70svh] w-full lg:h-full lg:flex-1">
        <div
          ref={stageRef}
          className={cn("relative h-full w-full", hoveredRoom ? "cursor-pointer" : "")}
        >
          <Canvas
            camera={{ position: overviewViewpoint(aspect).position, fov: 38, near: 0.1, far: 200 }}
            dpr={dpr}
            shadows
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
            <DepartamentoScene
              isMobile={isMobile}
              cameraTarget={cameraTarget}
              cameraTargetKey={cameraTargetKey}
              autoRotate={!prefersReducedMotion && !isMobile && !selectedRoom}
              hoveredRoom={hoveredRoom}
              selectedRoom={selectedRoom}
              onSelectRoom={handleSelectRoom}
              onHoverRoom={setHoveredRoom}
              labels={labelsRef}
              onReady={() => setSceneReady(true)}
            />
          </Canvas>

          {/* Room names, kept over each room by the scene. */}
          {sceneReady
            ? ROOMS.map((room) => (
                <button
                  key={room.id}
                  ref={(el) => {
                    labelsRef.current[room.id] = el;
                  }}
                  type="button"
                  onClick={() => handleSelectRoom(room.id)}
                  onPointerEnter={() => setHoveredRoom(room.id)}
                  onPointerLeave={() => setHoveredRoom(null)}
                  className={cn(
                    "invisible absolute top-0 left-0 z-[5] whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium shadow-sm backdrop-blur-md transition-colors duration-200",
                    selectedRoom === room.id
                      ? "bg-foreground text-background"
                      : hoveredRoom === room.id
                        ? "bg-background text-foreground"
                        : "bg-background/80 text-foreground-muted",
                  )}
                >
                  {room.nombre}
                </button>
              ))
            : null}

          <div
            className={cn(
              "pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background transition-opacity duration-700",
              sceneReady ? "opacity-0" : "opacity-100",
            )}
          >
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-strong">
              {PROYECTO.nombre} · Unidad {UNIDAD.codigo}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground-muted">
              Generando el 3D desde el plano…
            </p>
          </div>

          {selectedRoom ? (
            <button
              type="button"
              onClick={() => handleSelectRoom(null)}
              className="absolute top-16 right-3 z-20 rounded-full border border-border-subtle bg-background/85 px-3.5 py-1.5 text-xs font-medium backdrop-blur-md transition-colors duration-200 hover:border-accent sm:top-6 sm:right-6"
            >
              Ver todo el departamento
            </button>
          ) : null}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center bg-gradient-to-t from-background/90 to-transparent px-3 pb-2 pt-6">
            <p className="text-center font-mono text-[9px] uppercase tracking-[0.1em] text-foreground-muted/80 sm:text-[10px]">
              3D generado desde el plano del folleto · alturas y mobiliario aproximados
            </p>
          </div>

          {children}
        </div>
      </div>

      <DepartamentoPanel
        selectedRoom={selectedRoom}
        onSelectRoom={handleSelectRoom}
        onHoverRoom={setHoveredRoom}
        className="border-t border-border-subtle lg:h-full lg:w-[400px] lg:border-t-0 lg:border-l"
      />
    </div>
  );
}
