"use client";

import { SoftShadows } from "@react-three/drei";
import { SkyDome } from "@/components/three/visual/SkyDome";
import { SunSkyEnvironment } from "@/components/three/visual/SunSkyEnvironment";

const HORIZON = "#e2eaee";
const ZENITH = "#7fa9cf";
/** Where the sun is: the directional light, and the sun disc in the environment. */
const SUN: [number, number, number] = [38, 62, 46];
const SUN_COLOR = "#fff0d8";

/**
 * Afternoon light over Buenos Aires: the sun high in the north-east, so the north faces
 * (balconies, the side the camera looks from) are lit and the shadows fall south-west.
 */
export function EdificioLighting({
  highQuality,
  fogRange = [90, 330],
}: {
  highQuality: boolean;
  /** Fog start/end in meters; the real-location map reaches much farther than the city. */
  fogRange?: [number, number];
}) {
  return (
    <>
      <color attach="background" args={[HORIZON]} />
      <SkyDome zenith={ZENITH} horizon={HORIZON} ground="#d9e2e6" />
      <fog attach="fog" args={[HORIZON, fogRange[0], fogRange[1]]} />
      <ambientLight intensity={0.12} />
      <hemisphereLight args={["#d3e3f0", "#5c4c3c", 0.55]} />
      <directionalLight
        position={SUN}
        intensity={highQuality ? 3.1 : 2.3}
        color={SUN_COLOR}
        castShadow
        // Shadows cover ±40 m around the tower: its own shadow (~22 m at this sun height) and
        // the nearest blocks. At 2048² that is 3.9 cm a texel, about what ±70 m at 4096² gave
        // (3.4 cm), for ~40% less frame time (4096² soft shadows were the costliest pass).
        shadow-mapSize={highQuality ? [2048, 2048] : [1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={160}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-bias={-0.0003}
        shadow-normalBias={0.03}
      />
      {/* Penumbra in texels: 16 keeps the same softness in meters as 18 did at ±70 m / 4096². */}
      {highQuality ? <SoftShadows size={16} samples={12} focus={0.7} /> : null}
      {/* Image-based light from this sky and sun (was drei's "city" preset: a photo of a
          Berlin square, downloaded from a third-party CDN on every visit). */}
      <SunSkyEnvironment
        sun={SUN}
        zenith={ZENITH}
        // Warmer than the visible sky: afternoon haze, and sunlit pavement bouncing back.
        horizon="#efe4d2"
        ground="#b8a78d"
        sunColor={SUN_COLOR}
        sunIntensity={60}
        // The skyline hides some bright haze: a touch more intensity keeps the same fill.
        environmentIntensity={0.76}
        skyline="#a99f90"
      />
    </>
  );
}
