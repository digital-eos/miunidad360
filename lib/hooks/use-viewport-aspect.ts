"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("resize", callback);
  window.addEventListener("orientationchange", callback);
  return () => {
    window.removeEventListener("resize", callback);
    window.removeEventListener("orientationchange", callback);
  };
}

function getSnapshot() {
  return window.innerWidth / window.innerHeight;
}

function getServerSnapshot() {
  return 16 / 9;
}

/** Live window aspect ratio (width / height), for framing full-viewport 3D scenes. */
export function useViewportAspect() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
