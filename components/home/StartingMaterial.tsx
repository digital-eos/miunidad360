"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { featuredProject } from "@/config/featured";

const BASE = `/projects/${featuredProject.slug}`;

const FLOORS = [
  { id: "0-planta-baja", label: "Planta baja" },
  { id: "1-1er-piso", label: "1.er piso" },
  { id: "2-2do-piso", label: "2.º piso" },
  { id: "3-3er-piso", label: "3.er piso" },
] as const;

const DEFAULT_FLOOR = 1;

/**
 * "El material de partida": the project's render and a plan sheet, laid out like two
 * documents on a table. Shows what the developer hands over, before it becomes the 3D
 * experience in the next section.
 */
export function StartingMaterial() {
  const [floorIndex, setFloorIndex] = useState(DEFAULT_FLOOR);
  const [renderFailed, setRenderFailed] = useState(false);
  const render = featuredProject.fotos[0];
  const floor = FLOORS[floorIndex];

  return (
    <figure className="mx-auto w-full max-w-xl">
      <div className="relative pb-[30%] pr-[14%] sm:pb-[26%]">
        {/* Render del proyecto */}
        <div className="relative -rotate-2 rounded-md bg-white p-2 shadow-[0_18px_40px_-18px_rgba(28,28,28,0.35)] ring-1 ring-black/5 sm:p-2.5">
          <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-background-elevated">
            {render && !renderFailed ? (
              <Image
                src={render.src}
                alt={render.alt}
                fill
                priority
                sizes="(max-width: 640px) 960px, 560px"
                className="object-cover"
                onError={() => setRenderFailed(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-grid">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground-muted">
                  Render del proyecto
                </p>
              </div>
            )}
          </div>
          <p className="px-1 pt-2 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
            Render del proyecto
          </p>
        </div>

        {/* Hoja de plano */}
        <div className="absolute right-0 bottom-0 w-[62%] rotate-3 rounded-md bg-white p-2 shadow-[0_22px_44px_-16px_rgba(28,28,28,0.4)] ring-1 ring-black/5 sm:p-2.5">
          <div className="relative aspect-square overflow-hidden rounded-sm bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element -- static generated SVG */}
            <img
              key={floor.id}
              src={`${BASE}/plano-${floor.id}.svg`}
              alt={`Plano del ${floor.label.toLowerCase()} del proyecto`}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-1.5 px-1 pt-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
              Plano · {floor.label}
            </p>
            <div
              role="tablist"
              aria-label="Elegí el piso del plano"
              className="flex gap-1"
            >
              {FLOORS.map((f, i) => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={i === floorIndex}
                  aria-label={f.label}
                  title={f.label}
                  onClick={() => setFloorIndex(i)}
                  className={cn(
                    "h-6 min-w-6 rounded-full border px-1.5 font-mono text-[10px] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
                    i === floorIndex
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border-subtle text-foreground-muted hover:border-accent hover:text-foreground"
                  )}
                >
                  {i === 0 ? "PB" : i}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <figcaption className="mt-6 sm:mt-8">
        <p className="font-display text-lg">Material de partida</p>
        <p className="mt-1 text-[11px] leading-relaxed text-foreground-muted">
          Render: tamar benashvili · Planos generados por MiUnidad360 desde el modelo IFC
          · Dataset Schependomlaan (ROOT bv, Hendriks Bouw en Ontwikkeling, TU Eindhoven),
          CC BY 4.0
        </p>
      </figcaption>
    </figure>
  );
}
