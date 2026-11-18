"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import {
  ANCHO,
  PROFUNDIDAD,
  superficie,
  type Ambiente,
  type Planta,
} from "@/lib/proyectos/casa-citra";

const MARGEN = 0.9;
const WALL = 0.16;

const m2 = (n: number) =>
  `${n.toLocaleString("es-AR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} m²`;
const metros = (n: number) => n.toLocaleString("es-AR", { minimumFractionDigits: 2 });

/** Bounding box of a room: [x, y, w, h] in plan meters. */
function caja(a: Ambiente): [number, number, number, number] {
  if ("rect" in a.forma) return a.forma.rect;
  // Paths (absolute commands only): middle of the points they pass through.
  const xs: number[] = [];
  const ys: number[] = [];
  const re = /([MLHVA])([^MLHVAZ]*)/g;
  let cx = 0;
  let cy = 0;
  for (const [, cmd, args] of a.forma.path.matchAll(re)) {
    const v = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (cmd === "M" || cmd === "L") [cx, cy] = v;
    if (cmd === "H") cx = v[0];
    if (cmd === "V") cy = v[0];
    if (cmd === "A") [cx, cy] = [v[5], v[6]];
    xs.push(cx);
    ys.push(cy);
  }
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return [x, y, Math.max(...xs) - x, Math.max(...ys) - y];
}

const LETRA = 0.27;
/** Label size that fits the room's width (about 0.55 em per character). */
function letra(nombre: string, ancho: number) {
  return Math.min(LETRA, (ancho * 0.9) / (nombre.length * 0.55));
}

function Forma({ a, ...props }: { a: Ambiente } & React.SVGProps<SVGPathElement & SVGRectElement>) {
  if ("rect" in a.forma) {
    const [x, y, width, height] = a.forma.rect;
    return <rect x={x} y={y} width={width} height={height} {...props} />;
  }
  return <path d={a.forma.path} {...props} />;
}

/** North points to the left on the architect's sheets. */
function Norte() {
  return (
    <g transform={`translate(${-MARGEN / 2} ${PROFUNDIDAD / 2})`} aria-label="Norte">
      <path d="M-0.28 0 L0.12 -0.14 L0.04 0 L0.12 0.14 Z" fill="var(--foreground)" />
      <text
        x="0.05"
        y="-0.3"
        fontSize="0.26"
        textAnchor="middle"
        fill="var(--foreground-muted)"
        fontWeight={600}
      >
        N
      </text>
    </g>
  );
}

function Plano({
  planta,
  activo,
  onActivo,
}: {
  planta: Planta;
  activo: string | null;
  onActivo: (id: string | null) => void;
}) {
  const [ex, ey, ew, eh] = planta.escalera;
  const pasos = 12;
  return (
    <svg
      viewBox={`${-MARGEN} ${-MARGEN / 1.6} ${ANCHO + MARGEN * 1.6} ${PROFUNDIDAD + MARGEN * 1.3}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Plano esquemático: ${planta.nombre}`}
    >
      {/* Footprint of the upper floor (ground floor only). */}
      {planta.proyeccion ? (
        <path
          d={planta.proyeccion}
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth={0.04}
          strokeDasharray="0.18 0.12"
        />
      ) : null}

      {planta.ambientes.map((a) => {
        const on = activo === a.id;
        return (
          <Forma
            key={a.id}
            a={a}
            role="button"
            tabIndex={0}
            aria-label={a.nombre}
            aria-pressed={on}
            onMouseEnter={() => onActivo(a.id)}
            onFocus={() => onActivo(a.id)}
            onClick={() => onActivo(a.id)}
            className="cursor-pointer outline-none transition-[fill] duration-300"
            fill={
              on
                ? "var(--highlight)"
                : a.exterior
                  ? "var(--secondary-soft)"
                  : "var(--surface)"
            }
            fillOpacity={on ? 0.28 : 1}
            stroke="var(--border-strong)"
            strokeWidth={0.03}
          />
        );
      })}

      {/* Stair: treads across its run. */}
      <g pointerEvents="none">
        <rect x={ex} y={ey} width={ew} height={eh} fill="var(--surface-muted)" />
        {Array.from({ length: pasos - 1 }, (_, i) => (
          <line
            key={i}
            x1={ex + ((i + 1) * ew) / pasos}
            x2={ex + ((i + 1) * ew) / pasos}
            y1={ey}
            y2={ey + eh}
            stroke="var(--border-strong)"
            strokeWidth={0.02}
          />
        ))}
        <line x1={ex} x2={ex + ew} y1={ey + eh / 2} y2={ey + eh / 2} stroke="var(--foreground-subtle)" strokeWidth={0.025} />
      </g>

      {/* Outer walls. */}
      <path
        d={planta.contorno}
        fill="none"
        stroke="var(--foreground)"
        strokeWidth={WALL}
        strokeLinejoin="round"
        pointerEvents="none"
      />

      {planta.pilotes.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={0.14} fill="var(--foreground)" pointerEvents="none" />
      ))}

      {planta.ambientes.map((a) => {
        const [x, y, w, h] = caja(a);
        const [cx, cy] = [x + w / 2, y + h / 2];
        const size = letra(a.nombre, w);
        const s = superficie(a);
        const on = activo === a.id;
        return (
          // Too small to read on phones: the room list beside the plan carries the names there.
          <g key={a.id} pointerEvents="none" textAnchor="middle" className="max-sm:hidden">
            <text
              x={cx}
              y={cy}
              fontSize={size}
              fontWeight={on ? 700 : 600}
              fill={on ? "var(--foreground)" : "var(--foreground-muted)"}
            >
              {a.nombre}
            </text>
            {s ? (
              <text x={cx} y={cy + 0.36} fontSize={0.22} fill="var(--foreground-subtle)">
                {m2(s)}
              </text>
            ) : null}
          </g>
        );
      })}

      {/* Overall dimensions. */}
      <g
        fill="var(--foreground-subtle)"
        fontSize={0.24}
        textAnchor="middle"
        pointerEvents="none"
        className="max-sm:hidden"
      >
        <line x1={0} x2={ANCHO} y1={PROFUNDIDAD + 0.45} y2={PROFUNDIDAD + 0.45} stroke="var(--border-strong)" strokeWidth={0.02} />
        <text x={ANCHO / 2} y={PROFUNDIDAD + 0.38}>
          {metros(ANCHO)} m
        </text>
        <line x1={ANCHO + 0.45} x2={ANCHO + 0.45} y1={0} y2={PROFUNDIDAD} stroke="var(--border-strong)" strokeWidth={0.02} />
        <text
          x={ANCHO + 0.38}
          y={PROFUNDIDAD / 2}
          transform={`rotate(-90 ${ANCHO + 0.38} ${PROFUNDIDAD / 2})`}
        >
          {metros(PROFUNDIDAD)} m
        </text>
      </g>

      <Norte />
    </svg>
  );
}

/**
 * The house's three levels as schematic plans. Hovering or tapping a room (on the plan or in
 * the list) highlights it and shows its size.
 */
export function PlantasInteractivas({ plantas }: { plantas: Planta[] }) {
  const [plantaId, setPlantaId] = useState(plantas[1]?.id ?? plantas[0].id);
  const planta = plantas.find((p) => p.id === plantaId) ?? plantas[0];
  const [activo, setActivo] = useState<string | null>(null);
  const ambiente = planta.ambientes.find((a) => a.id === activo) ?? null;

  const cambiarPlanta = (id: string) => {
    setPlantaId(id);
    setActivo(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10">
      <div className="min-w-0">
        <div role="tablist" aria-label="Niveles" className="flex gap-1 rounded-lg bg-surface-muted p-1">
          {plantas.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={p.id === plantaId}
              onClick={() => cambiarPlanta(p.id)}
              className={cn(
                "relative flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200",
                p.id === plantaId ? "text-foreground" : "text-foreground-muted hover:text-foreground"
              )}
            >
              {p.id === plantaId ? (
                <motion.span
                  layoutId="planta-activa"
                  className="absolute inset-0 rounded-md bg-surface shadow-[var(--shadow-panel)]"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              ) : null}
              <span className="relative">{p.nombre}</span>
            </button>
          ))}
        </div>

        <div
          className="mt-4 overflow-hidden rounded-lg border border-border-subtle bg-background bg-grid p-3 sm:p-6"
          onMouseLeave={() => setActivo(null)}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={planta.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <Plano planta={planta} activo={activo} onActivo={setActivo} />
            </motion.div>
          </AnimatePresence>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-foreground-subtle">
          Plano esquemático redibujado de los planos del proyecto. Superficies aproximadas,
          calculadas con las cotas de cada ambiente.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="viewer-panel min-h-[8.5rem] p-5">
          <AnimatePresence mode="wait" initial={false}>
            {ambiente ? (
              <motion.div
                key={ambiente.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <p className="label-caps text-foreground-subtle">{planta.nombre}</p>
                <p className="mt-1 font-display text-2xl leading-tight">{ambiente.nombre}</p>
                {ambiente.medidas ? (
                  <p className="mt-2 text-sm tabular-nums text-foreground-muted">
                    {metros(ambiente.medidas[0])} × {metros(ambiente.medidas[1])} m ·{" "}
                    <span className="font-semibold text-foreground">≈ {m2(superficie(ambiente) ?? 0)}</span>
                  </p>
                ) : null}
                {ambiente.nota ? (
                  <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{ambiente.nota}</p>
                ) : null}
              </motion.div>
            ) : (
              <motion.div
                key="vacio"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <p className="label-caps text-foreground-subtle">{planta.nombre}</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
                  Pasá el cursor o tocá un ambiente, en el plano o en la lista, para ver sus medidas.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-surface">
          {planta.ambientes.map((a) => {
            const s = superficie(a);
            const on = a.id === activo;
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActivo(a.id)}
                  onFocus={() => setActivo(a.id)}
                  onClick={() => setActivo(a.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors duration-150",
                    on ? "bg-primary-soft text-foreground" : "text-foreground-muted hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className={cn(
                        "h-2.5 w-2.5 rounded-sm border",
                        on
                          ? "border-highlight bg-highlight"
                          : a.exterior
                            ? "border-secondary bg-secondary-soft"
                            : "border-border-strong bg-surface"
                      )}
                    />
                    {a.nombre}
                  </span>
                  <span className="tabular-nums">{s ? m2(s) : "—"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
