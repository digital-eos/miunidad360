"use client";

import { Suspense, useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { useLoader, type ThreeEvent } from "@react-three/fiber";
import { PLANTAS } from "@/lib/proyectos/casa-citra";
import {
  ABERTURAS,
  BARANDA,
  MODELO,
  MURO,
  NIVELES,
  type Fachada,
} from "@/lib/proyectos/casa-citra-3d";
import { cierres, escalera, formaDeAmbiente, losa } from "./geometria";

const BLANCO = "#f2f0ea";
const PISO = "#e7e3d9";
const EXTERIOR = "#d4dccd";
const RESALTE = "#b77b5c";
const HOVER = "#d9b39c";

const FACHADAS: Fachada[] = ["norte", "sur", "este", "oeste"];

function rect(x: number, y: number, w: number, h: number) {
  const s = new THREE.Shape();
  s.moveTo(x, y).lineTo(x + w, y).lineTo(x + w, y + h).lineTo(x, y + h).closePath();
  return s;
}

function merge(list: THREE.BufferGeometry[]) {
  if (list.length === 0) return null;
  const nonIndexed = list.map((g) => (g.index ? g.toNonIndexed() : g));
  return mergeGeometries(nonIndexed, false);
}

/** What the architect's model doesn't have in place, merged by material. */
function construirAgregados() {
  const blanco: THREE.BufferGeometry[] = [];
  const vidrio: THREE.BufferGeometry[] = [];
  const barandas: THREE.BufferGeometry[] = [];
  const verde: THREE.BufferGeometry[] = [];

  for (const nivel of NIVELES.slice(1)) {
    const aberturas = ABERTURAS[nivel.id];
    for (const f of FACHADAS) {
      const piezas = cierres(f, nivel.base, MURO, aberturas?.[f] ?? [], BARANDA);
      vidrio.push(...piezas.vidrios);
      barandas.push(...piezas.barandas);
    }
  }

  // Stairs between levels.
  for (let i = 0; i < NIVELES.length - 1; i++) {
    blanco.push(...escalera(PLANTAS[i].escalera, NIVELES[i].base, NIVELES[i + 1].base - NIVELES[i].base));
  }

  // Planter on the roof terrace: a low box.
  const cantero = PLANTAS[2].ambientes.find((a) => a.id === "cantero");
  if (cantero && "rect" in cantero.forma) {
    const [x, y, w, h] = cantero.forma.rect;
    verde.push(losa(rect(x + 0.1, y + 0.1, w - 0.2, h - 0.2), NIVELES[2].base + 0.55, 0.55));
  }

  return { blanco: merge(blanco), vidrio: merge(vidrio), barandas: merge(barandas), verde: merge(verde) };
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

/** The architect's model, with every material answering the level cut. */
function CasaGLB({ clipping, castShadow }: { clipping: THREE.Plane; castShadow: boolean }) {
  const gltf = useLoader(GLTFLoader, MODELO.url, (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder);
  });

  const { escena, materiales } = useMemo(() => {
    const copia = gltf.scene.clone(true);
    const propios = new Map<THREE.Material, THREE.MeshStandardMaterial>();
    copia.traverse((o: THREE.Object3D) => {
      if (!(o instanceof THREE.Mesh)) return;
      const original = o.material as THREE.MeshStandardMaterial;
      let m = propios.get(original);
      if (!m) {
        m = original.clone();
        m.clippingPlanes = [clipping];
        m.clipShadows = true;
        // SketchUp's unpainted faces take the warm white of the renders.
        const { r, g, b } = m.color;
        if (!m.map && Math.min(r, g, b) > 0.55) m.color.set(BLANCO);
        propios.set(original, m);
      }
      o.material = m;
      o.receiveShadow = true;
    });
    return { escena: copia, materiales: [...propios.values()] };
  }, [gltf, clipping]);

  useEffect(() => {
    escena.traverse((o: THREE.Object3D) => {
      if (o instanceof THREE.Mesh) o.castShadow = castShadow;
    });
  }, [escena, castShadow]);

  useEffect(() => () => materiales.forEach((m) => m.dispose()), [materiales]);

  return <primitive object={escena} position={MODELO.position} rotation={[0, MODELO.rotationY, 0]} />;
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
  const agregados = useMemo(() => construirAgregados(), []);
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
  const opacidadDe = (p: Pieza) => (p.id === selectedId ? 0.75 : p.id === hoveredId ? 0.55 : 0.22);

  return (
    <group>
      <Suspense fallback={null}>
        <CasaGLB clipping={clipping} castShadow={castShadow} />
      </Suspense>

      {(["blanco", "vidrio", "barandas", "verde"] as const).map((k) =>
        agregados[k] ? (
          <mesh
            key={k}
            geometry={agregados[k]!}
            material={materiales[k]}
            castShadow={castShadow && k !== "vidrio" && k !== "barandas"}
            receiveShadow
          />
        ) : null
      )}

      {/* Only the rooms of the level being looked at show and answer the pointer. */}
      {ambientes
        .filter((p) => p.nivel === nivelActivo)
        .map((p) => (
          <mesh
            key={`${p.nivel}-${p.id}`}
            geometry={p.geometry}
            onPointerOver={(e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation();
              onPointerOver(p.id);
            }}
            onPointerOut={() => onPointerOut(p.id)}
            onClick={(e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              onSelect(p.id);
            }}
          >
            <meshStandardMaterial
              color={colorDe(p)}
              roughness={0.9}
              transparent
              opacity={opacidadDe(p)}
              depthWrite={false}
              clippingPlanes={[clipping]}
            />
          </mesh>
        ))}
    </group>
  );
}
