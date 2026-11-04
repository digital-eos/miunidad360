"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { useNightContext } from "./night-context";

const DAY_SKY = new THREE.Color("#bcd7e8");
const NIGHT_SKY = new THREE.Color("#060810");
const DAY_FOG = new THREE.Color("#cfe3ee");
const NIGHT_FOG = new THREE.Color("#05060b");
const DAY_SUN = new THREE.Color("#fff3d8");
const NIGHT_SUN = new THREE.Color("#8fa6d9");

const tmpSky = new THREE.Color();
const tmpFog = new THREE.Color();
const tmpSun = new THREE.Color();

export function Lighting() {
  const { factorRef } = useNightContext();
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const bgRef = useRef<THREE.Color>(null);
  const fogRef = useRef<THREE.Fog>(null);

  useFrame(() => {
    const night = factorRef.current;

    if (bgRef.current) {
      tmpSky.copy(DAY_SKY).lerp(NIGHT_SKY, night);
      bgRef.current.copy(tmpSky);
    }

    if (fogRef.current) {
      tmpFog.copy(DAY_FOG).lerp(NIGHT_FOG, night);
      fogRef.current.color.copy(tmpFog);
      // Far distances are generous enough to cover the maqueta demo's
      // furthest camera (the aerial viewpoint on narrow/mobile aspects).
      fogRef.current.near = THREE.MathUtils.lerp(45, 22, night);
      fogRef.current.far = THREE.MathUtils.lerp(300, 220, night);
    }

    if (sunRef.current) {
      tmpSun.copy(DAY_SUN).lerp(NIGHT_SUN, night);
      sunRef.current.color.copy(tmpSun);
      sunRef.current.intensity = THREE.MathUtils.lerp(2.4, 0.22, night);
      sunRef.current.position.set(
        THREE.MathUtils.lerp(22, -14, night),
        THREE.MathUtils.lerp(34, 20, night),
        THREE.MathUtils.lerp(14, -10, night),
      );
    }
    if (ambientRef.current) {
      ambientRef.current.intensity = THREE.MathUtils.lerp(0.55, 0.12, night);
    }
    if (hemiRef.current) {
      hemiRef.current.intensity = THREE.MathUtils.lerp(0.5, 0.15, night);
    }
  });

  return (
    <>
      <color ref={bgRef} attach="background" args={[DAY_SKY]} />
      <fog ref={fogRef} attach="fog" args={[DAY_FOG.getHex(), 45, 300]} />
      <ambientLight ref={ambientRef} intensity={0.55} />
      <hemisphereLight ref={hemiRef} args={["#dfeaf2", "#30261c", 0.5]} />
      <directionalLight
        ref={sunRef}
        position={[22, 34, 14]}
        intensity={2.4}
        color={DAY_SUN}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-bias={-0.0003}
      />
      <Environment preset="city" environmentIntensity={0.35} />
    </>
  );
}
