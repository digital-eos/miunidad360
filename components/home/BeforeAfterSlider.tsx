"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import type { FeaturedPhoto } from "@/config/featured";

type BeforeAfterSliderProps = {
  photos: FeaturedPhoto[];
  credito: string;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
};

const AUTO_SLIDE_MS = 2000;
const SETTLE_POSITION = 50;

export function BeforeAfterSlider({
  photos,
  credito,
  activeIndex,
  onActiveIndexChange,
}: BeforeAfterSliderProps) {
  const isMobile = useIsMobile();
  const prefersReducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  // Position = % of the width showing the photo, measured from the left.
  const [position, setPosition] = useState(() => (prefersReducedMotion ? SETTLE_POSITION : 100));
  const [mobileShowPhoto, setMobileShowPhoto] = useState(() => !prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = setTimeout(() => {
      setPosition(SETTLE_POSITION);
      setMobileShowPhoto(false);
    }, AUTO_SLIDE_MS);
    return () => clearTimeout(id);
  }, [prefersReducedMotion]);

  function updateFromClientX(clientX: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }

  useEffect(() => {
    if (isMobile) return;
    function handleMove(e: PointerEvent) {
      if (!draggingRef.current) return;
      updateFromClientX(e.clientX);
    }
    function handleUp() {
      draggingRef.current = false;
    }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [isMobile]);

  const activePhoto = photos[activeIndex] ?? photos[0];
  if (!activePhoto) return null;

  const thumbnails =
    photos.length > 1 ? (
      <div className="pointer-events-auto flex gap-1.5">
        {photos.map((photo, i) => (
          <button
            key={photo.src}
            type="button"
            onClick={() => onActiveIndexChange(i)}
            aria-label={photo.alt}
            className={cn(
              "h-8 w-8 overflow-hidden rounded-md border-2 transition-colors sm:h-9 sm:w-9",
              i === activeIndex ? "border-accent" : "border-border-subtle",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local placeholder SVGs, no next/image loader needed */}
            <img src={photo.src} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    ) : null;

  if (isMobile) {
    return (
      <div className="pointer-events-none absolute inset-0 z-20">
        <div
          title={credito}
          className={cn(
            "absolute inset-0 transition-opacity duration-500",
            mobileShowPhoto ? "opacity-100" : "opacity-0",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local placeholder SVG */}
          <img src={activePhoto.src} alt={activePhoto.alt} className="h-full w-full object-cover" />
        </div>

        <div className="pointer-events-auto absolute right-3 top-20 flex flex-col items-end gap-2">
          <div className="flex overflow-hidden rounded-full border border-border-subtle bg-background/90 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setMobileShowPhoto(true)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors duration-200",
                mobileShowPhoto
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground-muted hover:text-foreground",
              )}
            >
              Proyecto
            </button>
            <button
              type="button"
              onClick={() => setMobileShowPhoto(false)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors duration-200",
                !mobileShowPhoto
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground-muted hover:text-foreground",
              )}
            >
              3D
            </button>
          </div>
          {thumbnails}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="absolute inset-0 z-20 pointer-events-none">
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local placeholder SVG */}
        <img src={activePhoto.src} alt={activePhoto.alt} className="h-full w-full object-cover" />
        <span
          title={credito}
          className="absolute left-3 top-3 rounded-full bg-background/85 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-foreground-muted backdrop-blur-md"
        >
          El proyecto
        </span>
      </div>

      <span
        className="absolute right-3 top-3 rounded-full bg-background/85 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-foreground-muted backdrop-blur-md transition-opacity duration-300"
        style={{ opacity: position < 96 ? 1 : 0 }}
      >
        Lo que recibe tu comprador
      </span>

      <div
        role="slider"
        aria-label="Comparar foto de referencia con el modelo 3D"
        aria-valuenow={Math.round(position)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onPointerDown={(e) => {
          draggingRef.current = true;
          updateFromClientX(e.clientX);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setPosition((p) => Math.max(0, p - 5));
          if (e.key === "ArrowRight") setPosition((p) => Math.min(100, p + 5));
        }}
        className="pointer-events-auto group absolute inset-y-0 flex w-8 -translate-x-1/2 cursor-ew-resize touch-none flex-col items-center justify-center"
        style={{ left: `${position}%` }}
      >
        <span className="h-full w-0.5 bg-background/80" />
        <span className="absolute flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-background shadow-md shadow-black/20 transition-transform duration-150 group-active:scale-95">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-4 w-4 text-foreground-muted"
          >
            <path d="M8 7l-4 5 4 5M16 7l4 5-4 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>

      {thumbnails ? (
        <div className="pointer-events-auto absolute right-3 top-14 sm:top-16">{thumbnails}</div>
      ) : null}
    </div>
  );
}
