"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { TilesRenderer as TilesRendererImpl } from "3d-tiles-renderer";
import type { Viewpoint } from "@/components/three/CameraRig";
import { latLonToScene, PASEO_ALDREY, SITE } from "@/lib/geo/site";

export type FlyoverCaption = "Mar del Plata" | "Paseo Aldrey" | typeof SITE.address;

type Props = {
  tiles: TilesRendererImpl | null;
  /** Nothing to wait for (dev preview without tiles). */
  preloaded?: boolean;
  /** The atmosphere's tables are in (otherwise the sky renders black). */
  skyReady: boolean;
  groundHeight: number;
  /** Where the flight lands: the selector's overview shot, so the hand-off is seamless. */
  endView: Viewpoint;
  durationMs: number;
  /** Increment to cut the flight short (a floor or unit picked, a drag on the canvas). */
  skipToken: number;
  /** The first view's tiles have streamed in: the loader can fade. */
  onStartVisible: () => void;
  onCaption: (caption: FlyoverCaption) => void;
  onComplete: () => void;
};

/** How long to wait for the opening view's tiles before flying anyway. */
const PRELOAD_TIMEOUT_MS = 10000;
/** Pause on the opening view once it's loaded, before the camera moves. */
const HOLD_MS = 900;

function easeInOutSine(t: number) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

/**
 * Google-Earth-style approach: from over the sea, looking at the city, across Paseo Aldrey,
 * down onto Buenos Aires 2771 and into the selector's overview. Keyframes are spread evenly
 * in curve time but shrink with altitude, so the camera is fast up high and slow near the
 * ground, the way a real descent feels.
 */
export function AerialFlyover({
  tiles,
  preloaded = false,
  skyReady,
  groundHeight,
  endView,
  durationMs,
  skipToken,
  onStartVisible,
  onCaption,
  onComplete,
}: Props) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);

  const { positions, targets } = useMemo(() => {
    const aldrey = latLonToScene(PASEO_ALDREY.lat, PASEO_ALDREY.lon, 0, groundHeight);
    const midway = aldrey.clone().multiplyScalar(0.45);
    const end = new THREE.Vector3(...endView.position);
    const endTarget = new THREE.Vector3(...endView.target);
    // Scene +Z points at the facade bearing (ESE): that's toward the sea.
    const p = [
      new THREE.Vector3(-420, 1400, 3600), // offshore, below the clouds, the whole city ahead
      new THREE.Vector3(-140, 820, 1950), // crossing the coast
      new THREE.Vector3(aldrey.x + 150, 340, aldrey.z + 330), // over Paseo Aldrey
      new THREE.Vector3(end.x * 2.6, end.y * 2.3, end.z * 3.6), // dropping toward the street
      end,
    ];
    const t = [
      new THREE.Vector3(0, 0, -2600), // pitched up: horizon and clouds over the city
      aldrey.clone(),
      midway,
      new THREE.Vector3(endTarget.x, endTarget.y * 0.8, endTarget.z + 6),
      endTarget,
    ];
    return {
      positions: new THREE.CatmullRomCurve3(p, false, "centripetal"),
      targets: new THREE.CatmullRomCurve3(t, false, "centripetal"),
    };
  }, [groundHeight, endView]);

  const state = useRef<{
    phase: "preload" | "hold" | "fly" | "done";
    since: number;
    caption: FlyoverCaption | null;
  }>({ phase: "preload", since: 0, caption: null });
  const lookAt = useRef(new THREE.Vector3());

  // Park the camera on the opening view right away (once: the curves are rebuilt when the
  // ground height is refined mid-flight, which must not send the camera back).
  const parked = useRef(false);
  useEffect(() => {
    if (parked.current) return;
    parked.current = true;
    state.current.since = performance.now();
    camera.position.copy(positions.getPoint(0));
    camera.lookAt(targets.getPoint(0));
    camera.updateMatrixWorld();
    invalidate();
  }, [camera, positions, targets, invalidate]);

  const skipRef = useRef(skipToken);
  useEffect(() => {
    if (skipToken === skipRef.current) return;
    skipRef.current = skipToken;
    if (state.current.phase !== "done") {
      if (state.current.phase === "preload") onStartVisible();
      state.current.phase = "done";
      onComplete();
    }
  }, [skipToken, onComplete, onStartVisible]);

  const setCaption = useCallback(
    (caption: FlyoverCaption) => {
      if (state.current.caption === caption) return;
      state.current.caption = caption;
      onCaption(caption);
    },
    [onCaption]
  );

  useFrame(() => {
    const s = state.current;
    const now = performance.now();

    if (s.phase === "preload") {
      const progress = tiles?.root ? tiles.loadProgress : 0;
      const tilesIn = preloaded || (tiles?.root && progress >= 0.97);
      if ((skyReady && tilesIn) || now - s.since > PRELOAD_TIMEOUT_MS) {
        s.phase = "hold";
        s.since = now;
        onStartVisible();
        setCaption("Mar del Plata");
      }
      return;
    }
    if (s.phase === "hold") {
      if (now - s.since > HOLD_MS) {
        s.phase = "fly";
        s.since = now;
      }
      return;
    }
    if (s.phase !== "fly") return;

    const t = THREE.MathUtils.clamp((now - s.since) / durationMs, 0, 1);
    const u = easeInOutSine(t);
    camera.position.copy(positions.getPoint(u));
    lookAt.current.copy(targets.getPoint(u));
    camera.lookAt(lookAt.current);
    invalidate();

    setCaption(u < 0.3 ? "Mar del Plata" : u < 0.62 ? "Paseo Aldrey" : SITE.address);

    if (t >= 1) {
      s.phase = "done";
      onComplete();
    }
  });

  return null;
}
