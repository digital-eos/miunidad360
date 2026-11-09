"use client";

import {
  DepthOfField,
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
  /**
   * World point to keep sharp. When set, everything nearer or farther blurs lightly and the
   * colors fade a little, so that point stands out ("focus mode").
   */
  focus?: [number, number, number] | null;
  /** Ambient occlusion (and the normal pass it needs: the scene drawn a second time). */
  ssao?: boolean;
  /** MSAA samples of the composer's target (the canvas itself is not antialiased). */
  multisampling?: number;
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
export function PostFX({
  aoRadius = 1.2,
  focus = null,
  ssao = true,
  multisampling = 4,
}: PostFXProps) {
  return (
    <EffectComposer multisampling={multisampling} enableNormalPass={ssao}>
      {ssao ? (
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
      ) : (
        <></>
      )}
      {focus ? (
        <DepthOfField target={focus} worldFocusRange={8} bokehScale={3} />
      ) : (
        <></>
      )}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <HueSaturation saturation={focus ? -0.3 : 0.1} />
      <Vignette offset={0.32} darkness={0.32} />
    </EffectComposer>
  );
}
