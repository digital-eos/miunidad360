"use client";

import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { BuildingModel } from "./BuildingModel";

type HeroSceneProps = {
  spinning: boolean;
};

const MAX_DPR = 1.75;

export default function HeroScene({ spinning }: HeroSceneProps) {
  const [dpr, setDpr] = useState(MAX_DPR);

  return (
    <Canvas
      camera={{ position: [5.4, 2, 5.6], fov: 28 }}
      dpr={dpr}
      gl={{ antialias: true, alpha: true }}
    >
      <PerformanceMonitor
        bounds={() => [50, 58]}
        onDecline={() => setDpr((d) => Math.max(0.75, d - 0.25))}
        onIncline={() => setDpr((d) => Math.min(MAX_DPR, d + 0.25))}
      />
      <color attach="background" args={["#0a0a0b"]} />
      <fog attach="fog" args={["#0a0a0b", 7, 15]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 6, 3]} intensity={1.1} color="#f4f2ec" />
      <directionalLight position={[-4, 2, -3]} intensity={0.3} color="#f0a63b" />
      <group position={[1.4, -0.9, -0.6]}>
        <BuildingModel spinning={spinning} />
      </group>
    </Canvas>
  );
}
