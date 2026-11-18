"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import type { Foto } from "@/lib/proyectos/casa-citra";

/** Grid placement of each tile on large screens, in order: one large, two stacked, three across. */
const TILES = [
  "lg:col-span-8 lg:row-span-2",
  "lg:col-span-4",
  "lg:col-span-4",
  "lg:col-span-4",
  "lg:col-span-4",
  "lg:col-span-4",
];

const SWIPE_PX = 80;

/**
 * Editorial mosaic of the project's renders. A tile grows into a full-screen viewer (shared
 * element transition), where photos slide with arrows, keys, a swipe or the film strip.
 */
export function GaleriaEditorial({ fotos }: { fotos: Foto[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [direction, setDirection] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  const close = useCallback(() => {
    setDirection(0);
    setOpen(null);
  }, []);
  const go = useCallback(
    (delta: number) => {
      setDirection(delta);
      setOpen((i) => (i === null ? i : (i + delta + fotos.length) % fotos.length));
    },
    [fotos.length]
  );
  /** From the grid: the tile itself grows into the viewer, no slide. */
  const openAt = useCallback((i: number) => {
    setDirection(0);
    setOpen(i);
  }, []);
  /** From the film strip: slide toward the chosen photo. */
  const jump = (i: number) => {
    if (open === null || i === open) return;
    setDirection(i > open ? 1 : -1);
    setOpen(i);
  };

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close, go]);

  const current = open === null ? null : fotos[open];
  const layout = !reducedMotion;

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_PX) go(1);
    else if (info.offset.x > SWIPE_PX) go(-1);
  };

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:gap-3 lg:auto-rows-[clamp(11rem,15vw,15.5rem)] lg:grid-cols-12">
        {fotos.map((f, i) => (
          <li
            key={f.src}
            className={cn(
              // Phones: the first and an unpaired last photo take the full width.
              i === 0 || (i === fotos.length - 1 && i % 2 === 1) ? "col-span-2" : "col-span-1",
              TILES[i] ?? "lg:col-span-4"
            )}
          >
            <button
              type="button"
              onClick={() => openAt(i)}
              aria-label={`Ver ${f.titulo} en pantalla completa`}
              className="group relative block h-full w-full overflow-hidden rounded-md bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <motion.div
                layoutId={layout ? `foto-${f.src}` : undefined}
                className="h-full w-full overflow-hidden rounded-md"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={i === 0 ? f.src : f.miniatura}
                  alt={f.alt}
                  width={f.width}
                  height={f.height}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[16/10] h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.045] lg:aspect-auto"
                />
              </motion.div>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-md bg-gradient-to-t from-black/55 via-black/0 to-black/0 opacity-70 transition-opacity duration-500 group-hover:opacity-100"
              />
              <span className="pointer-events-none absolute right-0 bottom-0 left-0 flex items-end justify-between gap-3 p-3 text-left text-white sm:p-4">
                <span>
                  <span className="label-caps block text-white/70 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="mt-0.5 block font-display text-lg leading-tight sm:text-xl">
                    {f.titulo}
                  </span>
                </span>
                <span className="hidden translate-y-1 text-xs font-medium text-white/90 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 sm:block">
                  Ampliar ↗
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {current && open !== null ? (
          <motion.div
            key="visor"
            role="dialog"
            aria-modal="true"
            aria-label={`${current.titulo}, foto ${open + 1} de ${fotos.length}`}
            className="fixed inset-0 z-[70] flex flex-col"
            initial={{ opacity: 1 }}
            exit={{ opacity: 1 }}
          >
            <motion.div
              aria-hidden
              className="absolute inset-0 bg-[#141716]/95 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              onClick={close}
            />

            <motion.div
              className="relative z-10 flex items-center justify-between gap-4 px-4 py-3 text-sm text-white/80 sm:px-6"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <p className="min-w-0 truncate">
                <span className="tabular-nums text-white">
                  {String(open + 1).padStart(2, "0")}
                </span>
                <span className="text-white/40"> / {String(fotos.length).padStart(2, "0")}</span>
                <span className="ml-3 font-display text-base text-white">{current.titulo}</span>
              </p>
              <button
                type="button"
                onClick={close}
                className="rounded-md px-3 py-1.5 text-white transition-colors hover:bg-white/10"
                aria-label="Cerrar"
              >
                Cerrar ✕
              </button>
            </motion.div>

            <div className="pointer-events-none relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3 sm:px-16">
              <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.div
                  key={current.src}
                  layoutId={layout ? `foto-${current.src}` : undefined}
                  custom={direction}
                  variants={{
                    enter: (d: number) => ({ x: d * 60, opacity: 0 }),
                    center: { x: 0, opacity: 1 },
                    exit: (d: number) => ({ x: d * -60, opacity: 0 }),
                  }}
                  initial={direction === 0 ? false : "enter"}
                  animate="center"
                  exit={direction === 0 ? undefined : "exit"}
                  transition={{ type: "spring", stiffness: 260, damping: 32 }}
                  drag={reducedMotion ? false : "x"}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.6}
                  onDragEnd={onDragEnd}
                  className="pointer-events-auto relative cursor-grab overflow-hidden rounded-md shadow-2xl active:cursor-grabbing"
                  style={{
                    aspectRatio: `${current.width} / ${current.height}`,
                    width: `min(100%, calc((100dvh - 11rem) * ${current.width / current.height}))`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={current.src}
                    alt={current.alt}
                    draggable={false}
                    className="h-full w-full object-cover select-none"
                  />
                </motion.div>
              </AnimatePresence>

              <button
                type="button"
                onClick={() => go(-1)}
                className="pointer-events-auto absolute top-1/2 left-2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white transition-colors hover:bg-white/20 sm:flex"
                aria-label="Foto anterior"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                className="pointer-events-auto absolute top-1/2 right-2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white transition-colors hover:bg-white/20 sm:flex"
                aria-label="Foto siguiente"
              >
                ›
              </button>
            </div>

            <motion.div
              className="relative z-10 px-4 pt-3 pb-4 sm:pb-6"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <p className="mx-auto mb-3 max-w-2xl text-center text-sm text-white/70">
                {current.alt}
              </p>
              <div className="mx-auto flex max-w-full justify-center gap-2 overflow-x-auto">
                {fotos.map((f, i) => (
                  <button
                    key={f.src}
                    type="button"
                    onClick={() => jump(i)}
                    aria-label={`Ver ${f.titulo}`}
                    aria-current={i === open}
                    className={cn(
                      "relative h-12 w-20 shrink-0 overflow-hidden rounded transition-all duration-300 sm:h-14 sm:w-24",
                      i === open
                        ? "opacity-100 ring-2 ring-white ring-offset-2 ring-offset-[#141716]"
                        : "opacity-45 hover:opacity-80"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.miniatura} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
