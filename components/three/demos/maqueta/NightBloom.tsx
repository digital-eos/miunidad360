"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import type { BloomEffect } from "postprocessing";
import { useNightContext } from "./night-context";

export function NightBloom() {
  const { factorRef } = useNightContext();
  const bloomRef = useRef<BloomEffect>(null);

  useFrame(() => {
    if (bloomRef.current) {
      bloomRef.current.intensity = factorRef.current * 0.7;
    }
  });

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom
        ref={bloomRef}
        intensity={0}
        luminanceThreshold={0.4}
        luminanceSmoothing={0.2}
        mipmapBlur
      />
    </EffectComposer>
  );
}
