"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Full screen for the listing's 3D card (3D view + info card). The frame is pinned over the
 * whole window with CSS, and the browser's own full screen is asked for on top when it
 * exists (iPhone Safari has none for a div: the CSS version alone covers it there).
 */
export function useFullscreenFrame<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [expanded, setExpanded] = useState(false);

  const exit = useCallback(() => {
    setExpanded(false);
    if (typeof document !== "undefined" && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
  }, []);

  const enter = useCallback(() => {
    setExpanded(true);
    const el = ref.current;
    if (el && typeof el.requestFullscreen === "function") {
      void el.requestFullscreen().catch(() => {});
    }
  }, []);

  const toggle = useCallback(
    () => (expanded ? exit() : enter()),
    [expanded, enter, exit]
  );

  useEffect(() => {
    if (!expanded) return;
    // The browser's full screen was left (Esc, swipe): leave ours too.
    const onChange = () => {
      if (!document.fullscreenElement) setExpanded(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exit();
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("fullscreenchange", onChange);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("fullscreenchange", onChange);
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded, exit]);

  return { ref, expanded, toggle };
}

/** Classes for the frame: a rounded card in the page, the whole window when expanded. */
export function fullscreenFrameClass(expanded: boolean, className?: string) {
  return cn(
    "relative overflow-hidden rounded-2xl border border-border-subtle bg-background",
    className,
    expanded && "fixed inset-0 z-[60] h-[100dvh] rounded-none border-0 lg:h-[100dvh]"
  );
}

export function FullscreenButton({
  expanded,
  onToggle,
  className,
}: {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={expanded ? "Salir de pantalla completa" : "Ver en pantalla completa"}
      className={cn(
        "absolute top-4 left-4 z-30 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-background/85 px-3.5 py-1.5 text-xs font-medium backdrop-blur-md transition-colors duration-200 hover:border-accent hover:text-accent-strong",
        className
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
        aria-hidden
      >
        {expanded ? (
          <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
        ) : (
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        )}
      </svg>
      {expanded ? "Salir" : "Pantalla completa"}
    </button>
  );
}
