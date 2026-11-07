"use client";

import { Environment, SoftShadows } from "@react-three/drei";
import { SkyDome } from "@/components/three/visual/SkyDome";

const HORIZON = "#e2eaee";

/**
 * Afternoon light over Buenos Aires: the sun high in the north-east, so the north faces
 * (balconies, the side the camera looks from) are lit and the shadows fall south-west.
 */
export function EdificioLighting({ highQuality }: { highQuality: boolean }) {
  return (
    <>
      <color attach="background" args={[HORIZON]} />
      <SkyDome zenith="#7fa9cf" horizon={HORIZON} ground="#d9e2e6" />
      <fog attach="fog" args={[HORIZON, 90, 330]} />
      <ambientLight intensity={0.12} />
      <hemisphereLight args={["#d3e3f0", "#5c4c3c", 0.55]} />
      <directionalLight
        position={[38, 62, 46]}
        intensity={highQuality ? 3.1 : 2.3}
        color="#fff0d8"
        castShadow
        shadow-mapSize={highQuality ? [4096, 4096] : [2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={220}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-bias={-0.0003}
        shadow-normalBias={0.03}
      />
      {highQuality ? <SoftShadows size={18} samples={12} focus={0.7} /> : null}
      <Environment preset="city" environmentIntensity={0.55} />
    </>
  );
}
