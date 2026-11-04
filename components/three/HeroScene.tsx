"use client";

import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { sphereFitDistance } from "@/lib/three/camera-framing";
import { useViewportAspect } from "@/lib/hooks/use-viewport-aspect";
import { BuildingModel } from "./BuildingModel";

type HeroSceneProps = {
  spinning: boolean;
};

const MAX_DPR = 1.75;
const FOV = 28;
/** Direction of the original hand-placed camera, kept so the framing stays put when pulled back. */
const DIRECTION = [5.4, 2, 5.6] as const;
const DIRECTION_LENGTH = Math.hypot(...DIRECTION);
/** Bounding-sphere radius (world units, from the scene origin) of both towers in BuildingModel, after their group offset. */
const BUILDING_RADIUS = 5;

export default function HeroScene({ spinning }: HeroSceneProps) {
  const [dpr, setDpr] = useState(MAX_DPR);
  const aspect = useViewportAspect();

  const { position, fogNear, fogFar } = useMemo(() => {
    // Clamped so narrow mobile portraits don't push the camera back so far
    // the building shrinks to nothing — this is a decorative hero piece, not
    // the maqueta demo, so bleeding off the sides on a narrow screen is fine.
    const distance = sphereFitDistance(BUILDING_RADIUS, FOV, Math.max(aspect, 1));
    const scale = distance / DIRECTION_LENGTH;
    return {
      position: DIRECTION.map((v) => v * scale) as [number, number, number],
      fogNear: distance * 0.55,
      fogFar: distance * 1.7,
    };
  }, [aspect]);

  return (
    <Canvas
      camera={{ position, fov: FOV }}
      dpr={dpr}
      gl={{ antialias: true, alpha: true }}
    >
      <PerformanceMonitor
        bounds={() => [50, 58]}
        onDecline={() => setDpr((d) => Math.max(0.75, d - 0.25))}
        onIncline={() => setDpr((d) => Math.min(MAX_DPR, d + 0.25))}
      />
      <color attach="background" args={["#f7f5f0"]} />
      <fog attach="fog" args={["#f7f5f0", fogNear, fogFar]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 6, 3]} intensity={1.1} color="#fffaf0" />
      <directionalLight position={[-4, 2, -3]} intensity={0.3} color="#f0a63b" />
      <group position={[1.4, -0.9, -0.6]}>
        <BuildingModel spinning={spinning} />
      </group>
    </Canvas>
  );
}
