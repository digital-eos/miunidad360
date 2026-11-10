"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";

const BASE = "/projects/cataluna-ii/como-funciona";

type Slide = {
  file: string;
  title: string;
  alt: string;
};

/** Screenshots of the Cataluña II selector, in the order a buyer goes through it. */
const SLIDES: Slide[] = [
  {
    file: "edificio",
    title: "Tu edificio, en su dirección real",
    alt: "El edificio Cataluña II en 3D sobre el mapa de su barrio, con la lista de unidades y sus precios al costado",
  },
  {
    file: "unidad-hover",
    title: "Cada unidad muestra precio y disponibilidad",
    alt: "Una etiqueta sobre la unidad 402 del edificio en 3D: disponible, USD 152.000, 3 ambientes, 68 m²",
  },
  {
    file: "unidad-abierta",
    title: "Un clic abre plano, fotos y ficha",
    alt: "La unidad 402 abierta en el 3D, con sus fotos, su plano y su ficha de datos",
  },
];

const INTERVAL_MS = 5000;

/**
 * Large crossfade of the product's screenshots. Advances on its own, pauses while the
 * pointer or the keyboard focus is on it, and stays still with reduced motion.
 */
export function ResultSlideshow() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (paused || reducedMotion) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % SLIDES.length),
      INTERVAL_MS
    );
    return () => clearInterval(timer);
  }, [paused, reducedMotion, index]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Phones crop the list on the right so the 3D view stays readable. */}
      <div className="relative aspect-[5/4] overflow-hidden rounded-lg border border-border-subtle bg-surface-muted shadow-[var(--shadow-panel)] sm:aspect-[1600/1054]">
        {SLIDES.map((slide, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={slide.file}
            src={`${BASE}/${slide.file}-960.webp`}
            srcSet={`${BASE}/${slide.file}-960.webp 960w, ${BASE}/${slide.file}.webp 1600w`}
            sizes="(min-width: 1152px) 1088px, 150vw"
            alt={slide.alt}
            width={1600}
            height={1054}
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
            aria-hidden={i !== index}
            className={cn(
              "absolute inset-0 h-full w-full object-cover object-left transition-opacity duration-700 ease-in-out",
              i === index ? "opacity-100" : "opacity-0"
            )}
          />
        ))}
      </div>

      <div
        role="tablist"
        aria-label="Capturas del resultado"
        className="mt-4 grid grid-cols-3 gap-3 sm:gap-6"
      >
        {SLIDES.map((slide, i) => {
          const active = i === index;
          return (
            <button
              key={slide.file}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setIndex(i)}
              className={cn(
                "border-t-2 pt-3 text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary",
                active
                  ? "border-primary text-foreground"
                  : "border-border-subtle text-foreground-muted hover:border-border-strong hover:text-foreground"
              )}
            >
              <span className="label-caps tabular-nums text-foreground-subtle">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="mt-1 hidden text-sm leading-snug font-medium sm:block">
                {slide.title}
              </span>
            </button>
          );
        })}
      </div>
      {/* Phones: one caption for the current slide instead of three cramped ones. */}
      <p className="mt-3 text-sm font-medium sm:hidden" aria-live="polite">
        {SLIDES[index].title}
      </p>
    </div>
  );
}
