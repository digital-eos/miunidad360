"use client";

import { useCallback, useEffect, useState } from "react";
import { Container } from "@/components/ui/Container";

export type ListingImage = {
  src: string;
  /** Smaller version for the grid; falls back to `src`. */
  miniatura?: string;
  alt: string;
};

/** All the project's renders: a grid of thumbnails that opens a full-screen viewer. */
export function ListingGallery({
  images: galeria,
  title,
  credit,
}: {
  images: ListingImage[];
  title: string;
  /** Who made the renders, shown next to the count. */
  credit?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (delta: number) =>
      setOpen((i) => (i === null ? i : (i + delta + galeria.length) % galeria.length)),
    [galeria.length]
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close, step]);

  const current = open === null ? null : galeria[open];

  return (
    <section id="galeria" className="bg-background py-12 sm:py-16">
      <Container className="max-w-[1400px]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">
              Fotos
            </p>
            <h2 className="mt-2 font-display text-3xl leading-tight">{title}</h2>
          </div>
          <p className="text-sm text-foreground-muted">
            {galeria.length} renders{credit ? ` · ${credit}` : ""}
          </p>
        </div>

        <ul className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {galeria.map((img, i) => (
            <li key={img.src} className={i === 0 ? "col-span-2 row-span-2" : ""}>
              <button
                type="button"
                onClick={() => setOpen(i)}
                className="group block h-full w-full overflow-hidden rounded-md bg-surface-muted transition-opacity duration-150 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                aria-label={`Ver ${img.alt}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={i === 0 ? img.src : (img.miniatura ?? img.src)}
                  alt={img.alt}
                  loading="lazy"
                  decoding="async"
                  className="aspect-video h-full w-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      </Container>

      {current ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={current.alt}
          className="fixed inset-0 z-50 flex flex-col bg-foreground/95"
          onClick={close}
        >
          <div className="flex items-center justify-between px-4 py-3 text-sm text-white/80">
            <span>
              {(open ?? 0) + 1} / {galeria.length} · {current.alt}
            </span>
            <button
              type="button"
              onClick={close}
              className="rounded-md px-3 py-1 text-white hover:bg-white/10"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.src}
              alt={current.alt}
              className="max-h-full max-w-full rounded object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                step(-1);
              }}
              className="absolute top-1/2 left-3 -translate-y-1/2 rounded-md bg-white/10 px-3 py-2 text-xl text-white hover:bg-white/20"
              aria-label="Anterior"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                step(1);
              }}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md bg-white/10 px-3 py-2 text-xl text-white hover:bg-white/20"
              aria-label="Siguiente"
            >
              ›
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
