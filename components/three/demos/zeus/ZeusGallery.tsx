"use client";

import { useCallback, useEffect, useState } from "react";
import { Container } from "@/components/ui/Container";
import { zeusData } from "@/lib/zeus/dataset";

/** The project's renders: a grid of thumbnails that opens a full-screen viewer. */
export function ZeusGallery() {
  const { galeria, proyecto } = zeusData;
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
    <section id="galeria" className="border-t border-border-subtle bg-background py-16">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-strong">
              Galería
            </p>
            <h2 className="mt-2 font-display text-3xl">{proyecto.nombre} en imágenes</h2>
            <p className="mt-2 max-w-xl text-sm text-foreground-muted">{proyecto.descripcion}</p>
          </div>
          <p className="text-xs text-foreground-muted">
            {galeria.length} renders · {proyecto.estudio}
          </p>
        </div>

        <ul className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {galeria.map((img, i) => (
            <li key={img.src} className={i === 0 ? "col-span-2 row-span-2" : ""}>
              <button
                type="button"
                onClick={() => setOpen(i)}
                className="group block h-full w-full overflow-hidden rounded-lg bg-background-elevated focus-visible:outline-2 focus-visible:outline-accent"
                aria-label={`Ver ${img.alt}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={i === 0 ? img.src : img.miniatura}
                  alt={img.alt}
                  loading="lazy"
                  decoding="async"
                  className="aspect-video h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
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
          className="fixed inset-0 z-50 flex flex-col bg-black/92 backdrop-blur-sm"
          onClick={close}
        >
          <div className="flex items-center justify-between px-4 py-3 text-sm text-white/80">
            <span>
              {(open ?? 0) + 1} / {galeria.length} · {current.alt}
            </span>
            <button
              type="button"
              onClick={close}
              className="rounded-full px-3 py-1 text-white hover:bg-white/10"
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
              className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-xl text-white hover:bg-white/20"
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
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-xl text-white hover:bg-white/20"
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
