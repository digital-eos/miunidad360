"use client";

import { useSyncExternalStore } from "react";
import { isWebGLAvailable } from "@/lib/webgl";

function subscribe() {
  return () => {};
}

function getSnapshot(): boolean | null {
  if (typeof document === "undefined") return null;
  return isWebGLAvailable();
}

function getServerSnapshot(): boolean | null {
  return null;
}

export function useWebGLSupport() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
