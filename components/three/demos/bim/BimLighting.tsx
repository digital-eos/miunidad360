"use client";

import { Environment, SoftShadows } from "@react-three/drei";
import { SkyDome } from "@/components/three/visual/SkyDome";

const HORIZON = "#dfe9ee";

type BimLightingProps = {
  /** Desktop: soft (PCSS) sun shadows. Mobile keeps the cheaper default shadows. */
  highQuality: boolean;
};

export function BimLighting({ highQuality }: BimLightingProps) {
  return (
    <>
      <color attach="background" args={[HORIZON]} />
      <SkyDome horizon={HORIZON} />
      <fog attach="fog" args={[HORIZON, 45, 180]} />
      {/* Little flat ambient: the sky (hemisphere + environment) does the fill, so faces
          facing away from the sun keep some shape instead of going uniformly grey. */}
      <ambientLight intensity={0.12} />
      <hemisphereLight args={["#cfe0ee", "#5a4a3a", 0.5]} />
      <directionalLight
        position={[34, 40, 20]}
        // Mobile renders straight to screen (no composer), which reads brighter.
        intensity={highQuality ? 3 : 2.2}
        color="#ffefd6"
        castShadow
        shadow-mapSize={[3072, 3072]}
        shadow-camera-near={1}
        shadow-camera-far={130}
        shadow-camera-left={-48}
        shadow-camera-right={48}
        shadow-camera-top={48}
        shadow-camera-bottom={-48}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
      />
      {highQuality ? <SoftShadows size={22} samples={12} focus={0.6} /> : null}
      <Environment preset="city" environmentIntensity={0.5} />
    </>
  );
}
