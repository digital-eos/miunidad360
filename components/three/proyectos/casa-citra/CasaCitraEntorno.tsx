"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SoftShadows } from "@react-three/drei";
import { SkyDome } from "@/components/three/visual/SkyDome";

/**
 * Around the house: a pale sandy ground and a pine wood, in the white-model look of the
 * Torre Aldrey city. Trees are two instanced meshes (trunks, crowns), placed with a fixed
 * seed so they stand in the same spots on every visit, and kept off the house and its drive.
 */

const SUELO = "#e4dfd1";
const TRONCO = "#8f7a63";
const COPA = "#a9b8a0";
const HORIZONTE = "#e6ecee";
const CENIT = "#86abcb";

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

function plantarPinos(cantidad: number): Pino[] {
  const rand = mulberry32(20261118);
  const out: Pino[] = [];
  let tries = 0;
  while (out.length < cantidad && tries < cantidad * 30) {
    tries++;
    const r = 9 + Math.sqrt(rand()) * 52;
    const a = rand() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    // Clear of the house (12.25 × 6.70 m) with a margin, and of the drive to the carport (+Z).
    if (Math.abs(x) < 9.5 && Math.abs(z) < 7.5) continue;
    if (Math.abs(x) < 4 && z > 0 && z < 30) continue;
    if (out.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < 9)) continue;
    const alto = 9 + rand() * 9;
    out.push({ x, z, alto, copa: 2.2 + rand() * 1.6, giro: rand() * Math.PI });
  }
  return out;
}

function Pinar({ cantidad, castShadow }: { cantidad: number; castShadow: boolean }) {
  const pinos = useMemo(() => plantarPinos(cantidad), [cantidad]);
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

  return (
    <>
      <instancedMesh ref={troncos} args={[geos.tronco, undefined, pinos.length]} castShadow={castShadow} receiveShadow>
        <meshStandardMaterial color={TRONCO} roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={copas} args={[geos.copa, undefined, pinos.length]} castShadow={castShadow} receiveShadow>
        <meshStandardMaterial color={COPA} roughness={0.95} flatShading />
      </instancedMesh>
    </>
  );
}

/** Sky, ground, wood and the real sun (direction computed by the caller from the date). */
export function CasaCitraEntorno({
  sol,
  isMobile,
}: {
  /** Unit vector toward the sun, scene frame. */
  sol: THREE.Vector3;
  isMobile: boolean;
}) {
  const altura = Math.max(sol.y, 0);
  // Lower sun: warmer and dimmer; below the horizon only the sky light remains.
  const intensidad = sol.y <= 0 ? 0 : THREE.MathUtils.lerp(0.9, 3.0, Math.min(altura / 0.6, 1));
  const color = new THREE.Color("#ffd9a8").lerp(new THREE.Color("#fff3df"), Math.min(altura / 0.5, 1));
  const pos = sol.clone().multiplyScalar(45);

  return (
    <>
      <color attach="background" args={[HORIZONTE]} />
      <SkyDome zenith={CENIT} horizon={HORIZONTE} ground="#dcd8cb" />
      <fog attach="fog" args={[HORIZONTE, 60, 150]} />
      <hemisphereLight args={["#dbe7f1", "#7a6a55", 0.75]} />
      <ambientLight intensity={0.15} />
      <directionalLight
        position={[pos.x, Math.max(pos.y, 2), pos.z]}
        intensity={intensidad}
        color={color}
        castShadow
        shadow-mapSize={isMobile ? [1024, 1024] : [2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      {isMobile ? null : <SoftShadows size={14} samples={10} focus={0.7} />}

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[160, 64]} />
        <meshStandardMaterial color={SUELO} roughness={1} />
      </mesh>
      <Pinar cantidad={isMobile ? 70 : 150} castShadow={!isMobile} />
    </>
  );
}
