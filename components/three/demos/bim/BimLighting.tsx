"use client";

import { Environment } from "@react-three/drei";

const SKY = "#bcd7e8";
const FOG = "#cfe3ee";

export function BimLighting() {
  return (
    <>
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[FOG, 40, 170]} />
      <ambientLight intensity={0.6} />
      <hemisphereLight args={[SKY, "#30261c", 0.45]} />
      <directionalLight
        position={[18, 28, 14]}
        intensity={2.2}
        color="#fff6e8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={28}
        shadow-camera-bottom={-28}
        shadow-bias={-0.0003}
      />
      <Environment preset="city" environmentIntensity={0.3} />
    </>
  );
}
