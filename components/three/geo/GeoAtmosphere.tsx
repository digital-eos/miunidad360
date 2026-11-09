"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import {
  EffectMaterial,
  NormalPass,
  ToneMappingMode,
  type EffectComposer as EffectComposerImpl,
} from "postprocessing";
import {
  AerialPerspective,
  Atmosphere,
  LightingMask,
  SkyLight,
  SunLight,
  type AtmosphereApi,
} from "@takram/three-atmosphere/r3f";
import { Clouds } from "@takram/three-clouds/r3f";
import type { CloudsEffect } from "@takram/three-clouds";
import { sceneToEcefMatrix } from "@/lib/geo/site";

/** Layer of objects lit by real lights (the tower); the tiles are lit in post-process. */
export const LIGHT_SOURCE_LAYER = 10;

/** Physical sky radiance needs a high exposure; Takram's reference scenes use 10. */
const EXPOSURE = 10;
/** Light-source strengths for the tower, matched by eye to the post-lit surroundings. */
const SUN_SCALE = 0.5;
const SKY_SCALE = 0.7;

type Props = {
  groundHeight: number;
  date: Date;
  isMobile: boolean;
  /** Volumetric clouds (desktop). */
  clouds: boolean;
  /** Called once the scattering tables have downloaded (before that the sky is black). */
  onTexturesReady?: () => void;
  children?: ReactNode;
};

/**
 * Physically based sky, sunlight and aerial perspective for the real location
 * (Bruneton precomputed scattering, via @takram/three-atmosphere), plus volumetric clouds.
 *
 * Mixed lighting: Google's tiles are unlit photo textures, so they get sun + sky light in
 * post-process from their normals; the tower keeps real lights (sun with shadows + sky probe)
 * and is flagged with LIGHT_SOURCE_LAYER so the post-process doesn't light it twice. Both use
 * the same sun, so shading and shadows agree.
 */
export function GeoAtmosphere({
  groundHeight,
  date,
  isMobile,
  clouds,
  onTexturesReady,
  children,
}: Props) {
  const atmosphereRef = useRef<AtmosphereApi>(null);
  const composerRef = useRef<EffectComposerImpl>(null);
  const getThree = useThree((s) => s.get);
  const camera = useThree((s) => s.camera);
  const [cloudsEffect, setCloudsEffect] = useState<CloudsEffect | null>(null);

  const worldToEcef = useMemo(() => sceneToEcefMatrix(groundHeight), [groundHeight]);

  useLayoutEffect(() => {
    const atmosphere = atmosphereRef.current;
    if (!atmosphere) return;
    atmosphere.worldToECEFMatrix.copy(worldToEcef);
    atmosphere.updateByDate(date);
  }, [worldToEcef, date]);

  // Exposure for the physical units; restored for the classic scene.
  useEffect(() => {
    const renderer = getThree().gl;
    const previous = renderer.toneMappingExposure;
    renderer.toneMappingExposure = EXPOSURE;
    return () => {
      renderer.toneMappingExposure = previous;
    };
  }, [getThree]);

  // Half-float normals: the post-process lighting reads them, 8-bit bands visibly.
  useLayoutEffect(() => {
    const composer = composerRef.current;
    const normalPass = composer?.passes.find((p) => p instanceof NormalPass) as
      (NormalPass & { renderTarget: THREE.WebGLRenderTarget }) | undefined;
    if (normalPass) normalPass.renderTarget.texture.type = THREE.HalfFloatType;
  }, []);

  const texturesReported = useRef(false);
  useFrame(() => {
    if (texturesReported.current) return;
    const textures = atmosphereRef.current?.textures;
    const loaded = (t?: THREE.Texture | null) =>
      Boolean((t?.image as { data?: unknown } | undefined)?.data);
    if (
      textures &&
      loaded(textures.transmittanceTexture) &&
      loaded(textures.scatteringTexture) &&
      loaded(textures.irradianceTexture)
    ) {
      texturesReported.current = true;
      onTexturesReady?.();
    }
  });

  // The clip planes change with altitude (DynamicClipPlanes): effects must follow.
  useFrame(() => {
    composerRef.current?.passes.forEach((pass) => {
      const material = (pass as { fullscreenMaterial?: unknown }).fullscreenMaterial;
      if (material instanceof EffectMaterial) material.adoptCameraSettings(camera);
    });
  });

  // Clouds: slow drift, no cloud shadows (they would darken the street but not the tower,
  // which is lit by its own sun light), and a layer layout that keeps the low flight clear.
  useEffect(() => {
    if (!cloudsEffect) return;
    cloudsEffect.localWeatherVelocity.set(0.0012, 0.0004);
    const layers = cloudsEffect.cloudLayers;
    layers.forEach((layer) => {
      layer.shadow = false;
    });
    // Fair-weather cumulus above the flight (it starts at 1400 m), plus the default cirrus.
    if (layers[0]) Object.assign(layers[0], { altitude: 1800, height: 700 });
    if (layers[1]) Object.assign(layers[1], { altitude: 2300, height: 900 });
  }, [cloudsEffect]);

  return (
    <Atmosphere ref={atmosphereRef} textures="/geo/atmosphere/" correctAltitude>
      {/* Sun aimed at the tower: shadow frustum sized to the lot and its street. */}
      {/* Scaled to sit with the post-processed tiles at the same exposure. */}
      <SunLight
        intensity={SUN_SCALE}
        distance={220}
        castShadow
        shadow-mapSize={isMobile ? [1024, 1024] : [4096, 4096]}
        shadow-camera-near={1}
        shadow-camera-far={500}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-bias={-0.0003}
        shadow-normalBias={0.03}
      />
      <SkyLight intensity={SKY_SCALE} />
      <ShadowCatcher />
      {children}

      <EffectComposer ref={composerRef} multisampling={0} enableNormalPass>
        <LightingMask selectionLayer={LIGHT_SOURCE_LAYER} />
        {clouds ? (
          <Clouds
            ref={setCloudsEffect}
            qualityPreset="medium"
            coverage={0.32}
            localWeatherTexture="/geo/clouds/local_weather.png"
            shapeTexture="/geo/clouds/shape.bin"
            shapeDetailTexture="/geo/clouds/shape_detail.bin"
            turbulenceTexture="/geo/clouds/turbulence.png"
            stbnTexture="/geo/stbn.bin"
          />
        ) : (
          <></>
        )}
        <AerialPerspective
          sky
          sunLight
          skyLight
          correctGeometricError
          albedoScale={2 / Math.PI}
          stbnTexture="/geo/stbn.bin"
        />
        <ToneMapping mode={ToneMappingMode.AGX} />
        <SMAA />
        <Vignette offset={0.32} darkness={0.28} />
      </EffectComposer>
    </Atmosphere>
  );
}

/**
 * Receives the tower's shadow on the street. It renders as darkened albedo over the tiles,
 * which the post-process then lights: the shadowed ground keeps its sky light, as in life.
 */
function ShadowCatcher() {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.22, 0]} receiveShadow renderOrder={1}>
      <planeGeometry args={[150, 150]} />
      <shadowMaterial transparent opacity={0.42} depthWrite={false} />
    </mesh>
  );
}

/**
 * Near/far planes that follow the camera: ~0.3 m near the tower for the unit close-ups,
 * pushed out during the high-altitude flight so the city doesn't z-fight to the horizon.
 */
export function DynamicClipPlanes() {
  useFrame(({ camera }) => {
    const cam = camera as THREE.PerspectiveCamera;
    const height = Math.max(1, cam.position.y);
    const reach = Math.min(height, cam.position.length());
    const near = THREE.MathUtils.clamp(reach * 0.01, 0.3, 40);
    const far = Math.max(4000, height * 60);
    if (Math.abs(cam.near - near) > near * 0.05 || Math.abs(cam.far - far) > far * 0.05) {
      cam.near = near;
      cam.far = far;
      cam.updateProjectionMatrix();
    }
  });
  return null;
}
