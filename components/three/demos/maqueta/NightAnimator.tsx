"use client";

import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useNightContext } from "./night-context";

const TRANSITION_DURATION_MS = 2000;

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

type NightAnimatorProps = {
  onTransitioning?: (active: boolean) => void;
};

/** Ticks the shared day/night blend factor every frame; owns no visuals itself. */
export function NightAnimator({ onTransitioning }: NightAnimatorProps) {
  const { factorRef, transitionRef } = useNightContext();
  const { invalidate } = useThree();

  useFrame(() => {
    const transition = transitionRef.current;
    const elapsed = performance.now() - transition.start;
    const progress = THREE.MathUtils.clamp(elapsed / TRANSITION_DURATION_MS, 0, 1);
    const isActive = progress < 1 && transition.from !== transition.to;

    factorRef.current = THREE.MathUtils.lerp(transition.from, transition.to, smoothstep(progress));
    onTransitioning?.(isActive);
    if (isActive) invalidate();
  });

  return null;
}
