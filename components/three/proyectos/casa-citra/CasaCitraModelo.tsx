"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { ThreeEvent } from "@react-three/fiber";
import { ALTURA_PISO, ANCHO, PLANTAS, PROFUNDIDAD, VOLUMEN_PB_MEDIDAS } from "@/lib/proyectos/casa-citra";
import {
  ABERTURAS,
  ALTURA_TOTAL,
  BARANDA,
  LOSA,
  MURO,
  NIVELES,
  TECHOS,
  type Fachada,
} from "@/lib/proyectos/casa-citra-3d";
import {
  contorno,
  escalera,
  fachada,
  formaDeAmbiente,
  formaDePath,
  losa,
  muroEntre,
  OFFSET_X,
  OFFSET_Z,
} from "./geometria";

const BLANCO = "#f2f0ea";
const MADERA = "#a9764f";
const PISO = "#e7e3d9";
const EXTERIOR = "#d4dccd";
const RESALTE = "#b77b5c";
const HOVER = "#d9b39c";
const TABIQUE = 0.08;

const FACHADAS: Fachada[] = ["norte", "sur", "este", "oeste"];

function rect(x: number, y: number, w: number, h: number) {
  const s = new THREE.Shape();
  s.moveTo(x, y).lineTo(x + w, y).lineTo(x + w, y + h).lineTo(x, y + h).closePath();
  return s;
}

/** The ground floor's rounded volume, as an SVG path (same as the plans). */
function capsula(izq: number, der: number, fondo: number, r: number) {
  return [
    `M${izq + r} 0 H${der - r} A${r} ${r} 0 0 1 ${der} ${r} V${fondo - r}`,
    `A${r} ${r} 0 0 1 ${der - r} ${fondo} H${izq + r} A${r} ${r} 0 0 1 ${izq} ${fondo - r}`,
    `V${r} A${r} ${r} 0 0 1 ${izq + r} 0 Z`,
  ].join(" ");
}

function merge(list: THREE.BufferGeometry[]) {
  if (list.length === 0) return null;
  const nonIndexed = list.map((g) => (g.index ? g.toNonIndexed() : g));
  return mergeGeometries(nonIndexed, false);
}

/** Static parts of the house, merged by material: a handful of draw calls. */
function construirCasa() {
  const blanco: THREE.BufferGeometry[] = [];
  const madera: THREE.BufferGeometry[] = [];
  const vidrio: THREE.BufferGeometry[] = [];
  const barandas: THREE.BufferGeometry[] = [];

  const alto = ALTURA_PISO - LOSA;

  // Ground floor: the rounded wooden volume (outer skin) over a thin floor.
  const { izq, der, fondo, radio } = VOLUMEN_PB_MEDIDAS;
  const piel = formaDePath(capsula(izq, der, fondo, radio));
  const puntos = contorno(piel);
  for (let i = 0; i < puntos.length; i++) {
    const g = muroEntre(puntos[i], puntos[(i + 1) % puntos.length], 0, alto, MURO);
    if (g) madera.push(g);
  }
  blanco.push(losa(piel, 0.05, 0.05));

  // Columns, full height up to the 1st floor slab.
  for (const x of [0, 3, 6, 9, ANCHO]) {
    for (const y of [0, PROFUNDIDAD]) {
      const c = new THREE.CylinderGeometry(0.14, 0.14, alto, 16);
      c.translate(x + OFFSET_X + (x === 0 ? 0.15 : x === ANCHO ? -0.15 : 0), alto / 2, y + OFFSET_Z + (y === 0 ? 0.15 : -0.15));
      blanco.push(c);
    }
  }

  // Slabs: 1st floor and roof terrace floors over the full footprint, then the roofs.
  for (const n of NIVELES.slice(1)) blanco.push(losa(rect(0, 0, ANCHO, PROFUNDIDAD), n.base, LOSA));
  for (const [x, y, w, h] of TECHOS) blanco.push(losa(rect(x, y, w, h), ALTURA_TOTAL, LOSA));

  // Upper levels: the white box, with its loggias and windows.
  for (const nivel of NIVELES.slice(1)) {
    const aberturas = ABERTURAS[nivel.id];
    for (const f of FACHADAS) {
      const piezas = fachada(f, nivel.base, ALTURA_PISO - (nivel.id === "terraza" ? 0 : LOSA), MURO, aberturas?.[f] ?? [], BARANDA);
      blanco.push(...piezas.muros);
      vidrio.push(...piezas.vidrios);
      barandas.push(...piezas.barandas);
    }
  }

  // Stairs between levels.
  const planta0 = PLANTAS[0];
  blanco.push(...escalera(planta0.escalera, 0, ALTURA_PISO));
  blanco.push(...escalera(PLANTAS[1].escalera, ALTURA_PISO, ALTURA_PISO));

  // Interior partitions: the outline of every covered room, a little lower than the ceiling.
  for (let i = 0; i < PLANTAS.length; i++) {
    const base = NIVELES[i].base;
    for (const a of PLANTAS[i].ambientes) {
      if (a.exterior) continue;
      const pts = contorno(formaDeAmbiente(a));
      for (let j = 0; j < pts.length; j++) {
        const g = muroEntre(pts[j], pts[(j + 1) % pts.length], base, alto - 0.05, TABIQUE);
        if (g) blanco.push(g);
      }
    }
  }

  // Planter on the roof terrace: a low box.
  const cantero = PLANTAS[2].ambientes.find((a) => a.id === "cantero");
  const verde: THREE.BufferGeometry[] = [];
  if (cantero && "rect" in cantero.forma) {
    const [x, y, w, h] = cantero.forma.rect;
    verde.push(losa(rect(x + 0.1, y + 0.1, w - 0.2, h - 0.2), NIVELES[2].base + 0.55, 0.55));
  }

  return {
    blanco: merge(blanco),
    madera: merge(madera),
    vidrio: merge(vidrio),
    barandas: merge(barandas),
    verde: merge(verde),
  };
}

type Pieza = { id: string; nivel: number; exterior: boolean; geometry: THREE.BufferGeometry };

/** One floor patch per room, slightly above its slab: what the visitor hovers and picks. */
function construirAmbientes(): Pieza[] {
  const out: Pieza[] = [];
  PLANTAS.forEach((planta, i) => {
    for (const a of planta.ambientes) {
      out.push({
        id: a.id,
        nivel: i,
        exterior: Boolean(a.exterior),
        geometry: losa(formaDeAmbiente(a), NIVELES[i].base + 0.03, 0.03),
      });
    }
  });
  return out;
}

export function CasaCitraModelo({
  clipping,
  nivelActivo,
  hoveredId,
  selectedId,
  onPointerOver,
  onPointerOut,
  onSelect,
  castShadow,
}: {
  /** Shared plane cutting the house above the chosen level (none in the exterior view). */
  clipping: THREE.Plane;
  nivelActivo: number | null;
  hoveredId: string | null;
  selectedId: string | null;
  onPointerOver: (id: string) => void;
  onPointerOut: (id: string) => void;
  onSelect: (id: string) => void;
  castShadow: boolean;
}) {
  const casa = useMemo(() => construirCasa(), []);
  const ambientes = useMemo(() => construirAmbientes(), []);

  const materiales = useMemo(() => {
    const planes = [clipping];
    const m = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.88,
        metalness: 0,
        clippingPlanes: planes,
        clipShadows: true,
        side: THREE.DoubleSide,
        ...extra,
      });
    return {
      blanco: m(BLANCO),
      madera: m(MADERA, { roughness: 0.7 }),
      vidrio: m("#9fb5bf", { transparent: true, opacity: 0.38, roughness: 0.1, depthWrite: false }),
      barandas: m("#c9d6db", { transparent: true, opacity: 0.32, roughness: 0.1, depthWrite: false }),
      verde: m("#9aaa8b"),
    };
  }, [clipping]);

  useEffect(
    () => () => {
      Object.values(materiales).forEach((mat) => mat.dispose());
    },
    [materiales]
  );

  const colorDe = (p: Pieza) =>
    p.id === selectedId ? RESALTE : p.id === hoveredId ? HOVER : p.exterior ? EXTERIOR : PISO;

  return (
    <group>
      {(["blanco", "madera", "vidrio", "barandas", "verde"] as const).map((k) =>
        casa[k] ? (
          <mesh
            key={k}
            geometry={casa[k]!}
            material={materiales[k]}
            castShadow={castShadow && k !== "vidrio" && k !== "barandas"}
            receiveShadow
          />
        ) : null
      )}

      {ambientes.map((p) => {
        const activo = nivelActivo === p.nivel;
        return (
          <mesh
            key={`${p.nivel}-${p.id}`}
            geometry={p.geometry}
            receiveShadow
            // Only the rooms of the level being looked at answer the pointer.
            raycast={activo ? THREE.Mesh.prototype.raycast : () => null}
            onPointerOver={
              activo
                ? (e: ThreeEvent<PointerEvent>) => {
                    e.stopPropagation();
                    onPointerOver(p.id);
                  }
                : undefined
            }
            onPointerOut={activo ? () => onPointerOut(p.id) : undefined}
            onClick={
              activo
                ? (e: ThreeEvent<MouseEvent>) => {
                    e.stopPropagation();
                    onSelect(p.id);
                  }
                : undefined
            }
          >
            <meshStandardMaterial
              color={activo ? colorDe(p) : p.exterior ? EXTERIOR : PISO}
              roughness={0.9}
              clippingPlanes={[clipping]}
            />
          </mesh>
        );
      })}
    </group>
  );
}
