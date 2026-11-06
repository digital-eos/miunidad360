"use client";

import { Fragment, useEffect, useRef, useState, type PointerEvent } from "react";

const BASE = "/projects/schependomlaan";

type Stage = {
  title: string;
  caption: string;
  alt: string;
  src: string;
  srcMobile: string;
  width: number;
  height: number;
  /** Opens the large view on click. The last card scrolls to the 3D instead. */
  zoomable: boolean;
};

const STAGES: Stage[] = [
  {
    title: "El proyecto",
    caption: "Render del estudio",
    alt: "Render del estudio del proyecto Schependomlaan",
    src: `${BASE}/comparaciones/exterior-proyecto.webp`,
    srcMobile: `${BASE}/comparaciones/exterior-proyecto-960.webp`,
    width: 1920,
    height: 1014,
    zoomable: true,
  },
  {
    title: "La obra terminada",
    caption: "El edificio construido en Nijmegen",
    alt: "Foto del edificio Schependomlaan ya construido, en Nijmegen",
    src: `${BASE}/fotos-reales/foto-real-1.webp`,
    srcMobile: `${BASE}/fotos-reales/foto-real-1-960.webp`,
    width: 1440,
    height: 960,
    zoomable: true,
  },
  {
    title: "Tu experiencia 3D",
    caption: "Nuestro modelo 3D",
    alt: "Nuestro modelo 3D del edificio Schependomlaan, desde el mismo punto de vista",
    src: `${BASE}/comparaciones/exterior-miunidad360.webp`,
    srcMobile: `${BASE}/comparaciones/exterior-miunidad360-960.webp`,
    width: 1920,
    height: 1014,
    zoomable: false,
  },
];

// Cards are about a third of the container on desktop and ~80% of the screen on mobile,
// so the 960px files cover both; the full-size file is for large screens and the lightbox.
const SIZES = "(min-width: 768px) 360px, 80vw";

function StageImage({ stage }: { stage: Stage }) {
  return (
    <img
      src={stage.srcMobile}
      srcSet={`${stage.srcMobile} 960w, ${stage.src} ${stage.width}w`}
      sizes={SIZES}
      alt={stage.alt}
      width={stage.width}
      height={stage.height}
      loading="lazy"
      decoding="async"
      draggable={false}
      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
    />
  );
}

function PlayIcon() {
  return (
    <span
      aria-hidden
      className="absolute top-1/2 left-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-neutral-900 shadow-[0_2px_14px_rgba(0,0,0,0.3)] transition-transform duration-200 group-hover:scale-110"
    >
      <svg viewBox="0 0 24 24" className="ml-0.5 h-6 w-6" fill="currentColor">
        <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
      </svg>
    </span>
  );
}

function StepArrow() {
  return (
    <li aria-hidden className="hidden items-center self-center md:flex">
      <svg viewBox="0 0 40 12" className="h-3 w-8 text-foreground-muted/60" fill="none">
        <path
          d="M0 6h37m0 0-5-5m5 5-5 5"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </li>
  );
}

const frameClass =
  "group relative block aspect-[3/2] w-full overflow-hidden rounded-2xl border border-border-subtle bg-background-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function StageCard({
  stage,
  index,
  onZoom,
}: {
  stage: Stage;
  index: number;
  onZoom: (stage: Stage) => void;
}) {
  const label = (
    <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-black/60 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white sm:text-[11px]">
      {String(index + 1).padStart(2, "0")}
    </span>
  );

  return (
    <li className="flex w-[80%] shrink-0 snap-start flex-col sm:w-[60%] md:w-auto">
      <h3 className="mb-3 font-display text-xl leading-tight">{stage.title}</h3>
      {stage.zoomable ? (
        <button
          type="button"
          onClick={() => onZoom(stage)}
          className={`${frameClass} cursor-zoom-in`}
          aria-label={`Ver en grande: ${stage.caption}`}
        >
          <StageImage stage={stage} />
          {label}
        </button>
      ) : (
        <a
          href="#resultado"
          className={frameClass}
          aria-label={`${stage.caption}: recorrer en 3D`}
        >
          <StageImage stage={stage} />
          <span aria-hidden className="absolute inset-0 bg-black/10" />
          <PlayIcon />
          {label}
        </a>
      )}
      <p className="mt-3 text-sm text-foreground-muted">{stage.caption}</p>
    </li>
  );
}

const SWIPE_CLOSE_PX = 70;

function Lightbox({ stage, onClose }: { stage: Stage | null; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (stage && !dialog.open) {
      dialog.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!stage && dialog.open) {
      dialog.close();
    }
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [stage]);

  const handlePointerDown = (event: PointerEvent) => {
    startRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!startRef.current || event.pointerType === "mouse") return;
    setOffset({
      x: event.clientX - startRef.current.x,
      y: event.clientY - startRef.current.y,
    });
  };

  // Any tap or click closes; a swipe in any direction does too.
  const handlePointerUp = () => {
    startRef.current = null;
    setOffset({ x: 0, y: 0 });
    onClose();
  };

  const distance = Math.hypot(offset.x, offset.y);
  const fade = Math.max(0.35, 1 - distance / (SWIPE_CLOSE_PX * 4));

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        startRef.current = null;
        setOffset({ x: 0, y: 0 });
      }}
      aria-label={stage?.caption}
      className="m-0 h-dvh max-h-none w-screen max-w-none cursor-zoom-out bg-transparent p-0 backdrop:bg-black/85"
      style={{ touchAction: "none" }}
    >
      {stage ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-4 sm:p-10">
          <img
            src={stage.src}
            alt={stage.alt}
            width={stage.width}
            height={stage.height}
            draggable={false}
            className="max-h-[85dvh] w-auto max-w-full rounded-xl object-contain select-none"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px)`,
              opacity: fade,
              transition: distance === 0 ? "transform 200ms, opacity 200ms" : "none",
            }}
          />
          <p className="text-sm text-white/80">{stage.caption}</p>
          <button
            type="button"
            className="absolute top-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-xl text-white hover:bg-white/25"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
      ) : null}
    </dialog>
  );
}

export function FidelityStages() {
  const [zoomed, setZoomed] = useState<Stage | null>(null);

  return (
    <>
      <ol className="-mx-6 mt-10 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 pb-2 [scrollbar-width:none] sm:-mx-8 sm:scroll-px-8 sm:px-8 md:mx-0 md:grid md:grid-cols-[1fr_auto_1fr_auto_1fr] md:gap-4 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
        {STAGES.map((stage, index) => (
          <Fragment key={stage.title}>
            <StageCard stage={stage} index={index} onZoom={setZoomed} />
            {index < STAGES.length - 1 ? <StepArrow /> : null}
          </Fragment>
        ))}
      </ol>
      <Lightbox stage={zoomed} onClose={() => setZoomed(null)} />
    </>
  );
}

