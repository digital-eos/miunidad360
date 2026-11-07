"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Live aspect ratio (width / height) of an element, for framing 3D scenes that don't fill
 * the window (e.g. the homepage's framed visualizer). Falls back to the window aspect
 * until the element has been measured.
 */
export function useElementAspect(ref: RefObject<Element | null>) {
  // A hidden tab or a collapsed frame can report a 0 × 0 window: never return NaN, which
  // would poison the camera (and every clipping plane derived from it).
  const [aspect, setAspect] = useState(() =>
    typeof window === "undefined" || !(window.innerWidth > 0 && window.innerHeight > 0)
      ? 16 / 9
      : window.innerWidth / window.innerHeight
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setAspect(width / height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return aspect;
}
