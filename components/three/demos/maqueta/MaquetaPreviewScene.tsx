"use client";

import { useRef, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { totalBuildingHeight, type BuildingConfig } from "@/lib/three/building-config";
import { NightProvider } from "./night-context";
import { Building } from "./Building";

const PREVIEW_CONFIG: BuildingConfig = {
  floors: 6,
  apartmentsPerFloor: 4,
  floorHeight: 3.1,
  groundFloorHeight: 4.4,
  roofParapetHeight: 1.2,
  buildingWidth: 14,
  buildingDepth: 10,
  corridorGap: 0.7,
  balconyDepth: 1.3,
  windowInset: 0.1,
  slabThickness: 0.24,
};

function Spinner({ children }: { children: ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.2;
  });
  return <group ref={ref}>{children}</group>;
}

export default function MaquetaPreviewScene() {
  const height = totalBuildingHeight(PREVIEW_CONFIG);

  return (
    <Canvas
      camera={{
        position: [
          PREVIEW_CONFIG.buildingWidth * 0.95,
          height * 0.8,
          PREVIEW_CONFIG.buildingDepth * 1.35,
        ],
        fov: 38,
      }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={["#0a0a0b"]} />
      <fog attach="fog" args={["#0a0a0b", 18, 50]} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[14, 20, 10]} intensity={1.5} color="#f4f2ec" />
      <directionalLight position={[-10, 6, -8]} intensity={0.3} color="#f0a63b" />
      <NightProvider>
        <group position={[0, -height / 2, 0]}>
          <Spinner>
            <Building config={PREVIEW_CONFIG} castShadow={false} />
          </Spinner>
        </group>
      </NightProvider>
    </Canvas>
  );
}
