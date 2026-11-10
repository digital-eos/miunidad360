"use client";

import {
  CALLES,
  CANCHAS_PADEL,
  CANTEROS,
  CLUB_HOUSE,
  GUARDIA,
  LAGUNA,
  LOTE_GEOMS,
  MANZANA_GEOMS,
  PLAZA,
  type Poly,
} from "@/lib/lotes/barrio";
import { GROUND_COLORS } from "@/lib/lotes/ground-texture";
import { STATUS_COLORS } from "@/lib/units/status-colors";
import type { Unidad } from "@/lib/unidades/types";

const toPoints = (poly: Poly) => poly.map(([x, z]) => `${x},${z}`).join(" ");

/**
 * Top-down subdivision plan ("plano de loteo"): the same geometry as the 3D view, drawn as a
 * flat SVG with every lot numbered and clickable.
 */
export function LotesPlano({
  unidadesByCodigo,
  matches,
  hovered,
  selected,
  onHover,
  onSelect,
}: {
  unidadesByCodigo: Map<string, Unidad>;
  matches: Set<string>;
  hovered: string | null;
  selected: string | null;
  onHover: (codigo: string, hovering: boolean) => void;
  onSelect: (codigo: string) => void;
}) {
  return (
    <svg
      viewBox="-215 -225 430 485"
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full"
      role="img"
      aria-label="Plano de loteo del Barrio Demo"
    >
      <rect x={-260} y={-260} width={520} height={560} fill={GROUND_COLORS.pasto} />
      <polygon points={toPoints(LAGUNA)} fill="#a9cbd8" stroke="#86b3c4" strokeWidth={0.8} />
      {CALLES.map((c, i) => (
        <polygon key={i} points={toPoints(c)} fill="#f2efe8" />
      ))}
      {CANTEROS.map((c, i) => (
        <polygon key={i} points={toPoints(c)} fill={GROUND_COLORS.cantero} />
      ))}
      {MANZANA_GEOMS.map((m) => (
        <polygon key={m.numero} points={toPoints(m.poligono)} fill="#ffffff" />
      ))}

      {/* Amenities */}
      <rect x={CLUB_HOUSE[0] - 20} y={CLUB_HOUSE[1] - 10} width={40} height={20} rx={1} fill="#e9e3d6" stroke="#c9c1b1" strokeWidth={0.6} />
      <rect x={CLUB_HOUSE[0] - 2} y={CLUB_HOUSE[1] + 10} width={20} height={9} fill={GROUND_COLORS.pileta} />
      {CANCHAS_PADEL.map((c) => (
        <rect
          key={c.centro[0]}
          x={c.centro[0] - c.ancho / 2}
          y={c.centro[1] - c.largo / 2}
          width={c.ancho}
          height={c.largo}
          fill={GROUND_COLORS.padel}
          stroke="#ffffff"
          strokeWidth={0.4}
        />
      ))}
      <circle cx={PLAZA.centro[0]} cy={PLAZA.centro[1]} r={PLAZA.radio} fill={GROUND_COLORS.cantero} stroke={GROUND_COLORS.solado} strokeWidth={3} />
      <rect x={GUARDIA[0] - 2.5} y={GUARDIA[1] - 3} width={5} height={6} fill="#e9e3d6" stroke="#c9c1b1" strokeWidth={0.5} />

      {/* Lots */}
      {LOTE_GEOMS.map((lote) => {
        const unidad = unidadesByCodigo.get(lote.codigo);
        const isMatch = matches.has(lote.codigo);
        const color = unidad && isMatch ? STATUS_COLORS[unidad.estado] : "#dcd8cd";
        const active = hovered === lote.codigo || selected === lote.codigo;
        return (
          <g
            key={lote.codigo}
            role="button"
            tabIndex={0}
            aria-label={`${lote.codigo}, manzana ${lote.manzana}`}
            className="cursor-pointer outline-none"
            onPointerEnter={() => onHover(lote.codigo, true)}
            onPointerLeave={() => onHover(lote.codigo, false)}
            onClick={() => onSelect(lote.codigo)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(lote.codigo);
              }
            }}
          >
            <polygon
              points={toPoints(lote.poligono)}
              fill={color}
              fillOpacity={active ? 0.95 : 0.7}
              stroke={selected === lote.codigo ? "#344b50" : "#ffffff"}
              strokeWidth={selected === lote.codigo ? 1.4 : 0.8}
            />
            <text
              x={lote.centro[0]}
              y={lote.centro[1]}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={7}
              fontFamily="var(--font-source-sans), sans-serif"
              fill="#292d2e"
              pointerEvents="none"
            >
              {lote.numero}
            </text>
          </g>
        );
      })}

      {MANZANA_GEOMS.map((m) => (
        <text
          key={m.numero}
          x={m.centro[0]}
          y={m.centro[1]}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={6}
          letterSpacing={1}
          fill="#5f6564"
          pointerEvents="none"
          style={{ textTransform: "uppercase" }}
        >
          {`MZ ${m.numero}`}
        </text>
      ))}

      {/* Place names */}
      {[
        { t: "LAGUNA", x: 0, y: -170 },
        { t: "CLUB HOUSE", x: CLUB_HOUSE[0], y: CLUB_HOUSE[1] - 15 },
        { t: "PÁDEL", x: CANCHAS_PADEL[1].centro[0], y: CANCHAS_PADEL[1].centro[1] - 15 },
        { t: "PLAZA", x: PLAZA.centro[0], y: PLAZA.centro[1] },
        { t: "ACCESO", x: GUARDIA[0] + 16, y: GUARDIA[1] },
      ].map((l) => (
        <text
          key={l.t}
          x={l.x}
          y={l.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={6.5}
          letterSpacing={1.2}
          fill="#292d2e"
          pointerEvents="none"
        >
          {l.t}
        </text>
      ))}

      {/* North arrow */}
      <g transform="translate(190 -200)" pointerEvents="none">
        <circle r={10} fill="#ffffff" stroke="#c9c1b1" strokeWidth={0.6} />
        <path d="M0 -7 L4 4 L0 1.5 L-4 4 Z" fill="#292d2e" />
        <text y={-13} textAnchor="middle" fontSize={6} fill="#292d2e">
          N
        </text>
      </g>
      {/* Scale bar: 50 m */}
      <g transform="translate(-200 245)" pointerEvents="none">
        <rect width={50} height={2.5} fill="#292d2e" />
        <rect width={25} height={2.5} fill="#ffffff" stroke="#292d2e" strokeWidth={0.4} />
        <text x={25} y={-4} textAnchor="middle" fontSize={5.5} fill="#292d2e">
          50 m
        </text>
      </g>
    </svg>
  );
}
