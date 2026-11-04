"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Environment } from "@react-three/drei";
import { type BuildingConfig, defaultBuildingConfig, totalBuildingHeight } from "@/lib/three/building-config";
import { sunDirectionVector, type SunPosition } from "@/lib/sun/sun-position";

const GOLDEN_SUN = new THREE.Color("#ffb066");
const DAY_SUN = new THREE.Color("#fff6e8");
const MOON_LIGHT = new THREE.Color("#9fb3d9");

const DAY_SKY = new THREE.Color("#bcd7e8");
const DUSK_SKY = new THREE.Color("#e7a764");
const NIGHT_SKY = new THREE.Color("#060810");

const DAY_FOG = new THREE.Color("#cfe3ee");
const NIGHT_FOG = new THREE.Color("#05060b");

const SUN_DISTANCE = 160;
const HORIZON_BAND = (6 * Math.PI) / 180; // smooth dawn/dusk transition over ~6deg
const GOLDEN_BAND = (18 * Math.PI) / 180;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export type SunLightingProps = {
  sunPosition: SunPosition;
  config?: BuildingConfig;
  shadowsEnabled?: boolean;
};

export function SunLighting({
  sunPosition,
  config = defaultBuildingConfig,
  shadowsEnabled = true,
}: SunLightingProps) {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);

  const height = totalBuildingHeight(config);
  const targetY = height * 0.35;

  useEffect(() => {
    if (sunRef.current && targetRef.current) {
      sunRef.current.target = targetRef.current;
    }
  }, []);

  const shadowExtent = Math.max(config.buildingWidth, config.buildingDepth) * 2.1;

  const { lightPosition, dayFactor, goldenFactor } = useMemo(() => {
    const [dx, dy, dz] = sunDirectionVector(sunPosition);
    const position: [number, number, number] = [
      dx * SUN_DISTANCE,
      Math.max(dy * SUN_DISTANCE, 2),
      dz * SUN_DISTANCE,
    ];
    const day = smoothstep(-HORIZON_BAND, HORIZON_BAND, sunPosition.altitude);
    const golden = 1 - smoothstep(0, GOLDEN_BAND, Math.max(sunPosition.altitude, 0));
    return { lightPosition: position, dayFactor: day, goldenFactor: golden };
  }, [sunPosition]);

  useEffect(() => {
    if (sunRef.current) {
      const color = sunPosition.altitude <= 0 ? MOON_LIGHT : GOLDEN_SUN.clone().lerp(DAY_SUN, 1 - goldenFactor);
      sunRef.current.color.copy(color);

      const altitudeFactor = THREE.MathUtils.clamp(Math.sin(sunPosition.altitude), 0, 1);
      sunRef.current.intensity =
        sunPosition.altitude <= 0 ? 0.06 : THREE.MathUtils.lerp(0.35, 3.2, altitudeFactor);
    }
    if (ambientRef.current) {
      ambientRef.current.intensity = THREE.MathUtils.lerp(0.12, 0.55, dayFactor);
    }
    if (hemiRef.current) {
      hemiRef.current.intensity = THREE.MathUtils.lerp(0.15, 0.5, dayFactor);
    }
  }, [sunPosition, dayFactor, goldenFactor]);

  const skyColor = useMemo(() => {
    const base = DAY_SKY.clone().lerp(DUSK_SKY, goldenFactor);
    return base.lerp(NIGHT_SKY, 1 - dayFactor);
  }, [dayFactor, goldenFactor]);

  const fogColor = useMemo(() => DAY_FOG.clone().lerp(NIGHT_FOG, 1 - dayFactor), [dayFactor]);

  return (
    <>
      <color attach="background" args={[skyColor]} />
      <fog attach="fog" args={[fogColor.getHex(), 30, 150]} />
      <ambientLight ref={ambientRef} intensity={0.55} />
      <hemisphereLight ref={hemiRef} args={["#dfeaf2", "#30261c", 0.5]} />
      <object3D ref={targetRef} position={[0, targetY, 0]} />
      <directionalLight
        ref={sunRef}
        position={lightPosition}
        intensity={2.4}
        color={DAY_SUN}
        castShadow={shadowsEnabled}
        shadow-mapSize={shadowsEnabled ? [2048, 2048] : [256, 256]}
        shadow-camera-near={1}
        shadow-camera-far={SUN_DISTANCE + shadowExtent}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-bias={-0.00025}
        shadow-normalBias={0.03}
      />
      <Environment preset="city" environmentIntensity={0.3} />
    </>
  );
}
