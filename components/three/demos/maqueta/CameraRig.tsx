"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

export type ViewpointId = "aerial" | "street" | "facade";

export type Viewpoint = {
  position: [number, number, number];
  target: [number, number, number];
};

export type Viewpoints = Record<ViewpointId, Viewpoint>;

type CameraRigProps = {
  /** The viewpoint to fly to. */
  target: Viewpoint;
  /** Changes whenever `target` should trigger a new transition (an id, a floor number, …). */
  targetKey: string;
  autoRotateEnabled: boolean;
  autoRotateSpeed?: number;
  minDistance: number;
  maxDistance: number;
  onInteractionChange?: (interacting: boolean) => void;
};

const TRANSITION_MS = 1300;
const IDLE_RESUME_MS = 3500;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function CameraRig({
  target,
  targetKey,
  autoRotateEnabled,
  autoRotateSpeed = 0.55,
  minDistance,
  maxDistance,
  onInteractionChange,
}: CameraRigProps) {
  const { camera, invalidate } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const lastKeyRef = useRef<string | null>(null);
  const transitionRef = useRef<{
    active: boolean;
    start: number;
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
  } | null>(null);

  const lastInteractionRef = useRef(0);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    camera.position.set(...target.position);
    controlsRef.current?.target.set(...target.target);
    controlsRef.current?.update();
    lastKeyRef.current = targetKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (lastKeyRef.current === targetKey) return;
    lastKeyRef.current = targetKey;
    const controls = controlsRef.current;
    transitionRef.current = {
      active: true,
      start: performance.now(),
      fromPos: camera.position.clone(),
      toPos: new THREE.Vector3(...target.position),
      fromTarget: controls ? controls.target.clone() : new THREE.Vector3(),
      toTarget: new THREE.Vector3(...target.target),
    };
    lastInteractionRef.current = performance.now();
    invalidate();
  }, [targetKey, target, camera, invalidate]);

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const transition = transitionRef.current;
    if (transition?.active) {
      const elapsed = performance.now() - transition.start;
      const progress = THREE.MathUtils.clamp(elapsed / TRANSITION_MS, 0, 1);
      const eased = easeInOutCubic(progress);
      camera.position.lerpVectors(transition.fromPos, transition.toPos, eased);
      controls.target.lerpVectors(transition.fromTarget, transition.toTarget, eased);
      controls.update();
      if (progress >= 1) transition.active = false;
      else invalidate();
      return;
    }

    const idle = performance.now() - lastInteractionRef.current > IDLE_RESUME_MS;
    controls.autoRotate = autoRotateEnabled && idle && !isDraggingRef.current;
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      autoRotateSpeed={autoRotateSpeed}
      minDistance={minDistance}
      maxDistance={maxDistance}
      maxPolarAngle={Math.PI / 2 - 0.04}
      minPolarAngle={0.25}
      onStart={() => {
        isDraggingRef.current = true;
        lastInteractionRef.current = performance.now();
        onInteractionChange?.(true);
        invalidate();
      }}
      onEnd={() => {
        isDraggingRef.current = false;
        lastInteractionRef.current = performance.now();
        onInteractionChange?.(false);
      }}
      onChange={() => invalidate()}
    />
  );
}
