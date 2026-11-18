"use client";

import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import type { Foto } from "@/lib/proyectos/casa-citra";

const INTERVAL_MS = 6500;

/**
 * Full-screen opening: the renders crossfade with a slow push-in, with a progress bar per
 * photo. Pauses while hovered; with reduced motion only the first photo shows, still.
 */
export function PortadaCinematica({
  fotos,
  children,
  arriba,
}: {
  fotos: Foto[];
  /** Title block, bottom left. */
  children: ReactNode;
  /** Top bar content. */
  arriba?: ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const playing = !paused && !reducedMotion;

  // The active progress bar is the clock: when its animation ends, the next photo comes in,
  // so pausing the bar pauses the slideshow too.
  const next = () => setIndex((i) => (i + 1) % fotos.length);

  return (
    <section
      className="relative h-[100svh] min-h-[32rem] overflow-hidden bg-[#141716] text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {fotos.map((f, i) => {
        const active = i === index;
        return (
          <motion.div
            key={f.src}
            aria-hidden={!active}
            className="absolute inset-0"
            initial={false}
            animate={{ opacity: active ? 1 : 0 }}
            transition={{ duration: 1.6, ease: "easeInOut" }}
          >
            <motion.img
              src={f.src}
              alt={active ? f.alt : ""}
              width={f.width}
              height={f.height}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : undefined}
              decoding="async"
              className="h-full w-full object-cover"
              initial={false}
              animate={
                reducedMotion
                  ? { scale: 1 }
                  : active
                    ? { scale: 1.09, x: i % 2 ? "-1.5%" : "1.5%" }
                    : { scale: 1.0, x: "0%" }
              }
              transition={
                active
                  ? { duration: (INTERVAL_MS + 1600) / 1000, ease: "linear" }
                  : { duration: 0, delay: 1.6 }
              }
            />
          </motion.div>
        );
      })}

      {/* Legibility: dark at the top bar and bottom title, clear in the middle. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(20,23,22,0.55)_0%,rgba(20,23,22,0)_22%,rgba(20,23,22,0)_45%,rgba(20,23,22,0.82)_100%)]"
      />

      {arriba ? (
        <div className="absolute top-0 right-0 left-0 z-10 px-5 pt-5 sm:px-8 sm:pt-6">{arriba}</div>
      ) : null}

      <div className="absolute right-0 bottom-0 left-0 z-10 px-5 pb-6 sm:px-8 sm:pb-8">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>

        <div className="mt-8 flex items-end gap-4">
          <div className="grid flex-1 grid-flow-col gap-2" role="tablist" aria-label="Fotos de portada">
            {fotos.map((f, i) => (
              <button
                key={f.src}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={f.titulo}
                onClick={() => setIndex(i)}
                className="group py-2 text-left"
              >
                <span className="relative block h-[2px] overflow-hidden rounded-full bg-white/25">
                  <span
                    key={i === index ? `on-${index}` : "off"}
                    className={cn(
                      "absolute inset-y-0 left-0 bg-white",
                      i < index && "w-full",
                      i > index && "w-0"
                    )}
                    onAnimationEnd={i === index ? next : undefined}
                    style={
                      i === index
                        ? {
                            width: reducedMotion ? "100%" : undefined,
                            animation: reducedMotion
                              ? undefined
                              : `portada-progreso ${INTERVAL_MS}ms linear forwards`,
                            animationPlayState: playing ? "running" : "paused",
                          }
                        : undefined
                    }
                  />
                </span>
                <span
                  className={cn(
                    "mt-2 hidden text-xs transition-colors duration-300 sm:block",
                    i === index ? "text-white" : "text-white/50 group-hover:text-white/80"
                  )}
                >
                  {f.titulo}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes portada-progreso { from { width: 0% } to { width: 100% } }`}</style>
    </section>
  );
}
