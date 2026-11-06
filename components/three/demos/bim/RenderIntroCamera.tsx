"use client";

/* eslint-disable react-hooks/immutability -- the three.js camera is mutated in useFrame. */

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { RENDER_CAMERA, renderProjection } from "@/lib/bim/render-camera";
import type { Viewpoint } from "@/components/three/demos/maqueta/CameraRig";

const GLIDE_MS = 2000;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Homepage intro camera: holds the studio render's viewpoint and projection (lens shift and
 * horizontal stretch, cropped like the image over the canvas), then — once `gliding` turns
 * true — flies to `to` while easing the projection back to a plain one. Unmounting it hands
 * the camera to CameraRig with a plain projection.
 */
export function RenderIntroCamera({
  to,
  fov,
  gliding,
  onArrive,
}: {
  to: Viewpoint;
  /** Field of view of the regular view, where the glide ends. */
  fov: number;
  gliding: boolean;
  onArrive: () => void;
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const get = useThree((s) => s.get);
  const glideStartRef = useRef<number | null>(null);
  const arrivedRef = useRef(false);
  const onArriveRef = useRef(onArrive);
  useEffect(() => {
    onArriveRef.current = onArrive;
  }, [onArrive]);

  const v = useMemo(
    () => ({
      fromPos: new THREE.Vector3(...RENDER_CAMERA.position),
      fromTarget: new THREE.Vector3(...RENDER_CAMERA.target),
      toPos: new THREE.Vector3(),
      toTarget: new THREE.Vector3(),
      target: new THREE.Vector3(),
    }),
    []
  );

  useFrame(() => {
    let t = 0;
    if (gliding) {
      const now = performance.now();
      glideStartRef.current ??= now;
      t = THREE.MathUtils.clamp((now - glideStartRef.current) / GLIDE_MS, 0, 1);
    }
    const k = easeInOutCubic(t);

    v.toPos.set(...to.position);
    v.toTarget.set(...to.target);
    camera.position.lerpVectors(v.fromPos, v.toPos, k);
    v.target.lerpVectors(v.fromTarget, v.toTarget, k);
    camera.lookAt(v.target);

    // Recomputed every frame, so a canvas resize can't reset it to a plain projection.
    const { width, height } = get().size;
    const frameAspect = width / Math.max(1, height);
    const start = renderProjection(frameAspect);
    const fEnd = 1 / Math.tan((fov * Math.PI) / 360);
    camera.aspect = frameAspect;
    camera.updateProjectionMatrix();
    const e = camera.projectionMatrix.elements;
    e[0] = THREE.MathUtils.lerp(start.e0, fEnd / frameAspect, k);
    e[5] = THREE.MathUtils.lerp(start.e5, fEnd, k);
    e[8] = THREE.MathUtils.lerp(start.e8, 0, k);
    e[9] = THREE.MathUtils.lerp(start.e9, 0, k);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();

    if (t >= 1 && !arrivedRef.current) {
      arrivedRef.current = true;
      onArriveRef.current();
    }
  });

  // Leave a plain projection behind, whether the glide finished or was cut short.
  useEffect(() => {
    return () => {
      const { width, height } = get().size;
      camera.fov = fov;
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    };
  }, [camera, fov, get]);

  return null;
}
