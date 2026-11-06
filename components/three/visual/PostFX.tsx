"use client";

import {
  EffectComposer,
  HueSaturation,
  SSAO,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";

type PostFXProps = {
  /** World-space radius of the ambient occlusion, in meters. */
  aoRadius?: number;
};

/**
 * Shared "architect photo" look for the desktop scenes: ambient occlusion in corners and
 * where volumes meet, ACES tone mapping, a touch of saturation and a soft vignette.
 * The composer turns the renderer's own tone mapping off, so ToneMapping here replaces it.
 *
 * Kept out on purpose:
 * - N8AO: n8ao 2.0.1 crashes on three r187.
 * - BrightnessContrast and daytime Bloom: both washed the image out.
 */
export function PostFX({ aoRadius = 1.2 }: PostFXProps) {
  return (
    <EffectComposer multisampling={4} enableNormalPass>
      <SSAO
        blendFunction={BlendFunction.MULTIPLY}
        worldDistanceThreshold={40}
        worldDistanceFalloff={10}
        worldProximityThreshold={aoRadius}
        worldProximityFalloff={aoRadius * 0.6}
        radius={0.08}
        intensity={2.2}
        luminanceInfluence={0.6}
        samples={16}
        rings={4}
        bias={0.02}
        fade={0.02}
        resolutionScale={0.5}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <HueSaturation saturation={0.1} />
      <Vignette offset={0.32} darkness={0.32} />
    </EffectComposer>
  );
}
