"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FidelityStages } from "@/components/home/FidelityStages";
import { featuredProject } from "@/config/featured";

const IMAGES = {
  miunidad: {
    src: "/comparaciones/exterior-miunidad360.webp",
    srcMobile: "/comparaciones/exterior-miunidad360-960.webp",
    alt: "Nuestro 3D del proyecto Schependomlaan, desde el mismo punto de vista",
  },
  proyecto: {
    src: "/comparaciones/exterior-proyecto.webp",
    srcMobile: "/comparaciones/exterior-proyecto-960.webp",
    alt: "Render del estudio del proyecto Schependomlaan",
  },
};

// First time on screen: the line sweeps 85% → 15%, then settles back at 50%.
const SWEEP = { from: 85, low: 15, rest: 50, durationMs: 2200, splitAt: 0.62 };

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function clamp(value: number) {
  return Math.min(100, Math.max(0, value));
}

function ComparisonImage({
  image,
  className,
  style,
}: {
  image: (typeof IMAGES)["miunidad"];
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <picture className={`absolute inset-0 block ${className ?? ""}`} style={style}>
      <source media="(max-width: 767px)" srcSet={image.srcMobile} />
      <img
        src={image.src}
        alt={image.alt}
        width={1920}
        height={1014}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="pointer-events-none h-full w-full object-cover select-none"
      />
    </picture>
  );
}

function RenderComparison() {
  const frameRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(SWEEP.rest);
  const draggingRef = useRef(false);
  const touchedRef = useRef(false);
  const sweepFrameRef = useRef<number | null>(null);

  const stopSweep = useCallback(() => {
    touchedRef.current = true;
    if (sweepFrameRef.current !== null) cancelAnimationFrame(sweepFrameRef.current);
    sweepFrameRef.current = null;
  }, []);

  // Wait off screen at the sweep's start, then play it once when the frame shows up.
  useEffect(() => {
    const el = frameRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const startId = requestAnimationFrame(() => {
      if (!touchedRef.current) setPosition(SWEEP.from);
    });

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        if (touchedRef.current) return;
        let start: number | null = null;
        const step = (now: number) => {
          start ??= now;
          const t = Math.min(1, (now - start) / SWEEP.durationMs);
          if (t < SWEEP.splitAt) {
            const k = easeOutCubic(t / SWEEP.splitAt);
            setPosition(SWEEP.from + (SWEEP.low - SWEEP.from) * k);
          } else {
            const k = easeOutCubic((t - SWEEP.splitAt) / (1 - SWEEP.splitAt));
            setPosition(SWEEP.low + (SWEEP.rest - SWEEP.low) * k);
          }
          sweepFrameRef.current = t < 1 ? requestAnimationFrame(step) : null;
        };
        sweepFrameRef.current = requestAnimationFrame(step);
      },
      { threshold: 0.6 }
    );
    observer.observe(el);
    return () => {
      cancelAnimationFrame(startId);
      observer.disconnect();
      if (sweepFrameRef.current !== null) cancelAnimationFrame(sweepFrameRef.current);
    };
  }, []);

  const moveTo = (clientX: number) => {
    const box = frameRef.current?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    setPosition(clamp(((clientX - box.left) / box.width) * 100));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    stopSweep();
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    moveTo(event.clientX);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) moveTo(event.clientX);
  };

  const endDrag = () => {
    draggingRef.current = false;
  };

  const percent = `${position}%`;

  return (
    <div className="group">
      <div
        ref={frameRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative aspect-[1920/1014] w-full cursor-ew-resize overflow-hidden rounded-2xl border border-border-subtle bg-background-elevated select-none"
        style={{ touchAction: "pan-y" }}
      >
        <ComparisonImage image={IMAGES.miunidad} />
        <ComparisonImage
          image={IMAGES.proyecto}
          style={{ clipPath: `inset(0 calc(100% - ${percent}) 0 0)` }}
        />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]"
          style={{ left: percent }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-sm font-semibold text-neutral-800 shadow-[0_2px_10px_rgba(0,0,0,0.25)] ring-accent ring-offset-2 group-has-[input:focus-visible]:ring-2"
          style={{ left: percent }}
        >
          ⇆
        </div>

        <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white sm:text-[11px]">
          Proyecto
        </span>
        <span className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-black/60 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white sm:text-[11px]">
          MiUnidad360
        </span>
      </div>

      <label className="sr-only">
        Posición de la línea entre el render del proyecto y el 3D de MiUnidad360
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(position)}
          onChange={(event) => {
            stopSweep();
            setPosition(clamp(Number(event.target.value)));
          }}
          aria-valuetext={`${Math.round(position)}% render del proyecto`}
        />
      </label>
    </div>
  );
}

export function FidelitySection() {
  return (
    <section
      id="fidelidad"
      className="scroll-mt-6 border-t border-border-subtle py-20 sm:py-24"
    >
      <Container>
        <SectionHeading
          eyebrow="Fidelidad"
          title="Del render a la obra, y de la obra a tu 3D"
          description="El mismo edificio en tres momentos: el render del estudio, el edificio construido y nuestro modelo 3D."
        />

        <FidelityStages />

        <SectionHeading
          className="mt-20"
          title="No es una interpretación: es el modelo de tu estudio."
          description="A la izquierda, el render del estudio. A la derecha, nuestro 3D desde el mismo punto de vista. Deslizá la línea: fachadas, pisos, ventanas y techos coinciden."
        />

        <div className="mt-10">
          <RenderComparison />
          <p className="mt-3 max-w-2xl text-xs leading-relaxed text-foreground-muted">
            En obra, el techo se terminó con tejas oscuras en lugar de zinc. El 3D muestra el
            proyecto tal como lo diseñó el estudio: la forma, los pisos y las aberturas son los
            mismos.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-foreground-muted/80">
            Render: {featuredProject.autores.render} ·{" "}
            {featuredProject.autores.foto ? `Foto: ${featuredProject.autores.foto} · ` : null}
            Modelo: dataset «Schependomlaan» (ROOT bv, Hendriks Bouw en Ontwikkeling, TU
            Eindhoven), CC BY 4.0
          </p>
        </div>

        <div className="mt-8">
          <a
            href="#resultado"
            className="inline-flex items-center justify-center rounded-full border border-border-subtle px-6 py-3 text-sm font-medium transition-colors duration-200 hover:border-accent hover:text-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Recorrer en 3D ↓
          </a>
        </div>
      </Container>
    </section>
  );
}
