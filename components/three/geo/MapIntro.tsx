"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { Viewpoint } from "@/components/three/CameraRig";
import { SITE } from "@/lib/geo/site";
import type { FlyoverCaption } from "./AerialFlyover";

type Props = {
  /** The map is drawn: the descent can start. */
  ready: boolean;
  /** Where the descent lands: the selector's overview shot, so the hand-off is seamless. */
  endView: Viewpoint;
  /** Increment to cut the descent short (a floor or unit picked, a drag on the canvas). */
  skipToken: number;
  onCaption: (caption: FlyoverCaption) => void;
  onComplete: () => void;
};

/** Height of the opening, top-down view above the lot (meters). */
const START_HEIGHT = 720;
/** Pause on the opening view before the camera moves. */
const HOLD_MS = 700;
const DURATION_MS = 5200;
/** Extra turn around the tower during the descent. */
const SWEEP = (110 * Math.PI) / 180;
/** Polar angle of the opening view: almost straight down, the map reads like a plan. */
const START_POLAR = 0.08;

function easeInOutSine(t: number) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

/**
 * Entrance over the 2D map: starts high above the neighborhood looking straight down, then
 * spirals down onto Buenos Aires 2771 and into the selector's overview. While high up, the fog
 * is pushed back so the map stays readable; it returns to normal on landing.
 */
export function MapIntro({ ready, endView, skipToken, onCaption, onComplete }: Props) {
  // Camera and scene are read through get(): they are mutated every frame, outside render.
  const get = useThree((s) => s.get);
  const invalidate = useThree((s) => s.invalidate);

  const path = useRef<{
    target: THREE.Vector3;
    end: THREE.Spherical;
  } | null>(null);
  if (path.current == null) {
    const target = new THREE.Vector3(...endView.target);
    const end = new THREE.Spherical().setFromVector3(
      new THREE.Vector3(...endView.position).sub(target),
    );
    path.current = { target, end };
  }

  const state = useRef<{
    phase: "wait" | "hold" | "fly" | "done";
    since: number;
    caption: FlyoverCaption | null;
    fog: { near: number; far: number } | null;
  }>({ phase: "wait", since: 0, caption: null, fog: null });
  const spherical = useRef(new THREE.Spherical());
  const offset = useRef(new THREE.Vector3());

  function place(u: number) {
    const { camera, scene } = get();
    const { target, end } = path.current!;
    const s = spherical.current;
    s.radius = THREE.MathUtils.lerp(START_HEIGHT, end.radius, u);
    // Tilt late, so the plan view lasts and the tower rises into view at the end.
    s.phi = THREE.MathUtils.lerp(START_POLAR, end.phi, u * u);
    s.theta = end.theta + SWEEP * (1 - u);
    offset.current.setFromSpherical(s);
    camera.position.copy(target).add(offset.current);
    camera.lookAt(target);
    camera.updateMatrixWorld();

    const fog = scene.fog as THREE.Fog | null;
    const base = state.current.fog;
    if (fog && base) {
      const lift = Math.max(0, s.radius - end.radius);
      fog.near = base.near + lift;
      fog.far = base.far + lift;
    }
  }

  function finish() {
    const s = state.current;
    if (s.phase === "done") return;
    s.phase = "done";
    const fog = get().scene.fog as THREE.Fog | null;
    if (fog && s.fog) {
      fog.near = s.fog.near;
      fog.far = s.fog.far;
    }
    onComplete();
  }

  function setCaption(caption: FlyoverCaption) {
    if (state.current.caption === caption) return;
    state.current.caption = caption;
    onCaption(caption);
  }

  // Park the camera on the opening view right away, behind the loader.
  useEffect(() => {
    state.current.since = performance.now();
    place(0);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skipRef = useRef(skipToken);
  useEffect(() => {
    if (skipToken === skipRef.current) return;
    skipRef.current = skipToken;
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipToken]);

  useFrame(({ scene }) => {
    const s = state.current;
    const now = performance.now();
    // The fog is mounted by the lighting: remember its normal range once it exists.
    if (!s.fog && scene.fog instanceof THREE.Fog) {
      s.fog = { near: scene.fog.near, far: scene.fog.far };
    }

    if (s.phase === "wait") {
      place(0);
      if (ready) {
        s.phase = "hold";
        s.since = now;
        setCaption("Mar del Plata");
      }
      return;
    }
    if (s.phase === "hold") {
      place(0);
      if (now - s.since > HOLD_MS) {
        s.phase = "fly";
        s.since = now;
      }
      return;
    }
    if (s.phase !== "fly") return;

    const t = THREE.MathUtils.clamp((now - s.since) / DURATION_MS, 0, 1);
    const u = easeInOutSine(t);
    place(u);
    invalidate();
    setCaption(u < 0.45 ? "Mar del Plata" : SITE.address);
    if (t >= 1) finish();
  });

  return null;
}
