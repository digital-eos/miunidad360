"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { SoftShadows } from "@react-three/drei";
import { SkyDome } from "@/components/three/visual/SkyDome";
import type { MapBlend } from "@/components/three/geo/MapGround";

/**
 * Around the house: a pine wood in the white-model look of the Torre Aldrey city. Trees are
 * two instanced meshes (trunks, crowns), placed with a fixed seed so they stand in the same
 * spots on every visit, kept off the house, its drive and (with the real map) the real streets.
 *
 * Without the map, a pale sandy ground. With it, the Google plan is the ground and the wood
 * grows out of it as the entrance descent turns the satellite photo into the plan.
 */

const SUELO = "#e4dfd1";
const TRONCO = "#8f7a63";
const COPA = "#a9b8a0";
const HORIZONTE = "#e6ecee";
const CENIT = "#86abcb";

/** Street centerlines in scene meters, as [x, z] points. */
export type Calles = [number, number][][];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Pino = { x: number; z: number; alto: number; copa: number; giro: number };

/** Radius of the clearing around the house (m). */
const CLARO = 27;
/** No trunk closer than this to a street centerline (half a sand road and its verge). */
const MARGEN_CALLE = 7;

function distanciaACalle(x: number, z: number, calles: Calles) {
  let best = Infinity;
  for (const linea of calles) {
    for (let i = 0; i < linea.length - 1; i++) {
      const [ax, az] = linea[i];
      const [bx, bz] = linea[i + 1];
      const dx = bx - ax;
      const dz = bz - az;
      const t = THREE.MathUtils.clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1), 0, 1);
      best = Math.min(best, Math.hypot(x - (ax + t * dx), z - (az + t * dz)));
    }
  }
  return best;
}

function plantarPinos(cantidad: number, alcance: number, calles: Calles | null): Pino[] {
  const rand = mulberry32(20261118);
  const out: Pino[] = [];
  let tries = 0;
  while (out.length < cantidad && tries < cantidad * 30) {
    tries++;
    // A clearing around the house, wide enough that the orbiting camera stays out of the
    // trunks; the wood starts at its edge and thins out toward the fog.
    const r = CLARO + Math.pow(rand(), 0.8) * alcance;
    const a = rand() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    // Clear of the drive from the house to the street (north, −X).
    if (Math.abs(z) < 4 && x < 0 && x > -CLARO - 10) continue;
    if (calles && distanciaACalle(x, z, calles) < MARGEN_CALLE) continue;
    if (out.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < 10)) continue;
    const alto = 8 + rand() * 7;
    out.push({ x, z, alto, copa: 2.6 + rand() * 1.8, giro: rand() * Math.PI });
  }
  return out;
}

function Pinar({
  cantidad,
  alcance,
  calles,
  castShadow,
  blendRef,
}: {
  cantidad: number;
  alcance: number;
  calles: Calles | null;
  castShadow: boolean;
  blendRef: RefObject<MapBlend> | null;
}) {
  const pinos = useMemo(() => plantarPinos(cantidad, alcance, calles), [cantidad, alcance, calles]);
  const grupo = useRef<THREE.Group>(null);
  const troncos = useRef<THREE.InstancedMesh>(null);
  const copas = useRef<THREE.InstancedMesh>(null);

  const geos = useMemo(() => {
    const tronco = new THREE.CylinderGeometry(0.12, 0.2, 1, 7);
    tronco.translate(0, 0.5, 0);
    // A sea pine: bare trunk, a flat, wide crown at the top.
    const copa = new THREE.IcosahedronGeometry(1, 1);
    copa.scale(1, 0.45, 1);
    return { tronco, copa };
  }, []);
  useEffect(() => () => void (geos.tronco.dispose(), geos.copa.dispose()), [geos]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    pinos.forEach((p, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.giro);
      m.compose(new THREE.Vector3(p.x, 0, p.z), q, new THREE.Vector3(1, p.alto, 1));
      troncos.current?.setMatrixAt(i, m);
      m.compose(
        new THREE.Vector3(p.x, p.alto - p.copa * 0.2, p.z),
        q,
        new THREE.Vector3(p.copa, p.copa, p.copa * 0.9)
      );
      copas.current?.setMatrixAt(i, m);
    });
    if (troncos.current) troncos.current.instanceMatrix.needsUpdate = true;
    if (copas.current) copas.current.instanceMatrix.needsUpdate = true;
  }, [pinos]);

  // With the map: the wood rises out of the plan, like Torre Aldrey's buildings.
  useFrame(() => {
    if (!grupo.current) return;
    const v = blendRef ? THREE.MathUtils.smoothstep(blendRef.current.value, 0.15, 1) : 1;
    grupo.current.scale.y = Math.max(v, 0.001);
    grupo.current.visible = v > 0.001;
  });

  return (
    <group ref={grupo}>
      <instancedMesh ref={troncos} args={[geos.tronco, undefined, pinos.length]} castShadow={castShadow} receiveShadow>
        <meshStandardMaterial color={TRONCO} roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={copas} args={[geos.copa, undefined, pinos.length]} castShadow={castShadow} receiveShadow>
        <meshStandardMaterial color={COPA} roughness={0.95} flatShading />
      </instancedMesh>
    </group>
  );
}

/** Radius of the model ground laid over the map once landed (m); its rim fades out. */
const RADIO_SUELO = 190;
const ANCHO_CALLE = 6.5;

/** Radial alpha: opaque in the middle, fading to nothing at the rim. */
function bordeSuave() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size / 2);
  g.addColorStop(0, "#fff");
  g.addColorStop(1, "#000");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

/** Street centerlines as flat ribbons (one merged geometry). */
function cintasDeCalles(calles: Calles) {
  const pos: number[] = [];
  const idx: number[] = [];
  const h = ANCHO_CALLE / 2;
  for (const linea of calles) {
    for (let i = 0; i < linea.length - 1; i++) {
      const [ax, az] = linea[i];
      const [bx, bz] = linea[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      if (len < 0.01 || Math.hypot(ax, az) > RADIO_SUELO + 40) continue;
      // Perpendicular, extended a little along the segment so joints have no gaps.
      const nx = (-(bz - az) / len) * h;
      const nz = ((bx - ax) / len) * h;
      const ex = ((bx - ax) / len) * h * 0.6;
      const ez = ((bz - az) / len) * h * 0.6;
      const base = pos.length / 3;
      pos.push(ax - ex + nx, 0, az - ez + nz, ax - ex - nx, 0, az - ez - nz, bx + ex - nx, 0, bz + ez - nz, bx + ex + nx, 0, bz + ez + nz);
      // Wound so the face normal points up (+Y).
      idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * The study-model ground over the real map: sand with the real streets as pale ribbons,
 * fading in as the descent turns the satellite photo into the plan, its rim melting into it.
 */
function SueloMaqueta({ blendRef, calles }: { blendRef: RefObject<MapBlend>; calles: Calles | null }) {
  const alpha = useMemo(() => bordeSuave(), []);
  const cintas = useMemo(() => (calles ? cintasDeCalles(calles) : null), [calles]);
  useEffect(() => () => alpha.dispose(), [alpha]);
  useEffect(() => () => cintas?.dispose(), [cintas]);
  const suelo = useRef<THREE.MeshStandardMaterial>(null);
  const calle = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    const v = THREE.MathUtils.smoothstep(blendRef.current.value, 0.1, 0.9);
    if (suelo.current) suelo.current.opacity = v;
    if (calle.current) calle.current.opacity = v;
  });

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow renderOrder={6}>
        <circleGeometry args={[RADIO_SUELO, 72]} />
        <meshStandardMaterial
          ref={suelo}
          color={SUELO}
          roughness={1}
          alphaMap={alpha}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      {cintas ? (
        <mesh geometry={cintas} position={[0, 0.04, 0]} receiveShadow renderOrder={7}>
          <meshStandardMaterial
            ref={calle}
            color="#f5f2ea"
            roughness={1}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ) : null}
    </>
  );
}

/** Sky, ground, wood and the real sun (direction computed by the caller from the date). */
export function CasaCitraEntorno({
  sol,
  isMobile,
  blendRef = null,
  calles = null,
}: {
  /** Unit vector toward the sun, scene frame. */
  sol: THREE.Vector3;
  isMobile: boolean;
  /** Set when the real map is the ground: no sand disc, the wood grows with the descent. */
  blendRef?: RefObject<MapBlend> | null;
  calles?: Calles | null;
}) {
  const conMapa = blendRef !== null;
  const altura = Math.max(sol.y, 0);
  // Lower sun: warmer and dimmer; below the horizon only the sky light remains.
  const intensidad = sol.y <= 0 ? 0 : THREE.MathUtils.lerp(0.9, 3.0, Math.min(altura / 0.6, 1));
  const color = new THREE.Color("#ffd9a8").lerp(new THREE.Color("#fff3df"), Math.min(altura / 0.5, 1));
  // Far enough out that the shadow box holds the house and the nearest pines' long winter
  // shadows; past its edge the ground would suddenly stop receiving shadows.
  const pos = sol.clone().multiplyScalar(80);

  return (
    <>
      <color attach="background" args={[HORIZONTE]} />
      <SkyDome zenith={CENIT} horizon={HORIZONTE} ground="#dcd8cb" />
      {/* The map reaches far: its fog starts later (the descent pushes it further still). */}
      <fog attach="fog" args={[HORIZONTE, conMapa ? 160 : 60, conMapa ? 900 : 150]} />
      <hemisphereLight args={["#dbe7f1", "#7a6a55", 0.75]} />
      <ambientLight intensity={0.15} />
      <directionalLight
        position={[pos.x, Math.max(pos.y, 2), pos.z]}
        intensity={intensidad}
        color={color}
        castShadow
        shadow-mapSize={isMobile ? [2048, 2048] : [4096, 4096]}
        shadow-camera-near={1}
        shadow-camera-far={220}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      {isMobile ? null : <SoftShadows size={14} samples={10} focus={0.7} />}

      {conMapa && blendRef ? (
        <SueloMaqueta blendRef={blendRef} calles={calles} />
      ) : (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[160, 64]} />
          <meshStandardMaterial color={SUELO} roughness={1} />
        </mesh>
      )}
      <Pinar
        cantidad={conMapa ? (isMobile ? 260 : 520) : isMobile ? 110 : 220}
        alcance={conMapa ? 120 : 55}
        calles={calles}
        castShadow={!isMobile}
        blendRef={blendRef}
      />
    </>
  );
}
