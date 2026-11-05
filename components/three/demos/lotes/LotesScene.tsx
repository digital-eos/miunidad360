"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { CameraRig, type Viewpoint } from "@/components/three/demos/maqueta/CameraRig";
import {
  CALLES,
  CANCHAS_PADEL,
  CLUB_HOUSE,
  GUARDIA,
  LAGUNA_CENTRO,
  LAGUNA,
  LOTE_GEOMS,
  MANZANA_GEOMS,
  NIVEL_AGUA,
  PLAZA,
  TERRENO,
  insetPolygon,
  pointInPolygon,
  seeded,
  terrainHeight,
  type LoteGeom,
  type Vec2,
} from "@/lib/lotes/barrio";
import { paintGround } from "@/lib/lotes/ground-texture";
import { STATUS_COLORS } from "@/lib/units/status-colors";
import type { Unidad } from "@/lib/unidades/types";

const SKY = "#dfe9ef";
const LOT_TOP = 0.35;
const LOT_BOTTOM = -0.4;
const FILTERED_OUT_COLOR = "#d6d2c6";
/** Camera-to-target distance under which every lot shows its number. */
const LABELS_DISTANCE = 190;

// ─── Ground ──────────────────────────────────────────────────────────────────

function Terrain() {
  const geometry = useMemo(() => {
    const spanX = TERRENO.maxX - TERRENO.minX;
    const spanZ = TERRENO.maxZ - TERRENO.minZ;
    const geo = new THREE.PlaneGeometry(spanX, spanZ, 160, 140);
    geo.rotateX(-Math.PI / 2);
    geo.translate(
      (TERRENO.minX + TERRENO.maxX) / 2,
      0,
      (TERRENO.minZ + TERRENO.maxZ) / 2
    );
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i += 1) {
      pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    paintGround(canvas);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, []);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh geometry={geometry} receiveShadow raycast={() => null}>
      <meshStandardMaterial map={texture} roughness={1} />
    </mesh>
  );
}

function Water() {
  const geometry = useMemo(() => {
    // Slightly larger than the shoreline: the rising bank hides the overlap.
    const shape = new THREE.Shape(
      LAGUNA.map(
        ([x, z]) =>
          new THREE.Vector2(
            LAGUNA_CENTRO[0] + (x - LAGUNA_CENTRO[0]) * 1.12,
            -(LAGUNA_CENTRO[1] + (z - LAGUNA_CENTRO[1]) * 1.12)
          )
      )
    );
    const geo = new THREE.ShapeGeometry(shape, 4);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} position={[0, NIVEL_AGUA, 0]} raycast={() => null}>
      <meshStandardMaterial
        color="#7fb3c8"
        roughness={0.15}
        metalness={0.1}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

// ─── Lots ────────────────────────────────────────────────────────────────────

/** A slab draped on the terrain: top face at ground + LOT_TOP, sides down into the ground. */
function buildLotGeometry(lote: LoteGeom): THREE.BufferGeometry {
  // A small inset leaves the lawn visible between neighbouring lots, like a lot line.
  const pts = insetPolygon(lote.poligono, 0.7);
  const n = pts.length;
  const positions: number[] = [];
  const indices: number[] = [];

  for (const [x, z] of pts) positions.push(x, terrainHeight(x, z) + LOT_TOP, z);
  for (const [x, z] of pts) positions.push(x, terrainHeight(x, z) + LOT_BOTTOM, z);

  const contour = pts.map(([x, z]) => new THREE.Vector2(x, z));
  const tris = THREE.ShapeUtils.triangulateShape(contour, []);
  const vertex = (i: number) => new THREE.Vector3().fromArray(positions, i * 3);
  const normalOf = (a: number, b: number, c: number) => {
    const va = vertex(a);
    return new THREE.Vector3()
      .subVectors(vertex(b), va)
      .cross(new THREE.Vector3().subVectors(vertex(c), va));
  };
  // Top faces point up, side faces point away from the lot's centre.
  for (const [a, b, c] of tris) {
    if (normalOf(a, b, c).y >= 0) indices.push(a, b, c);
    else indices.push(a, c, b);
  }
  const centre = new THREE.Vector3(lote.centro[0], 0, lote.centro[1]);
  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n;
    const outward = new THREE.Vector3().subVectors(vertex(i), centre).setY(0);
    if (normalOf(i, j, n + i).dot(outward) >= 0)
      indices.push(i, j, n + i, j, n + j, n + i);
    else indices.push(i, n + i, j, j, n + i, n + j);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  const nonIndexed = geo.toNonIndexed();
  nonIndexed.computeVertexNormals();
  return nonIndexed;
}

type LotsProps = {
  unidadesByCodigo: Map<string, Unidad>;
  matches: Set<string>;
  hovered: string | null;
  selected: string | null;
  showAllLabels: boolean;
  hideLabels?: boolean;
  onHover: (codigo: string, hovering: boolean) => void;
  onSelect: (codigo: string) => void;
};

function Lots({
  unidadesByCodigo,
  matches,
  hovered,
  selected,
  showAllLabels,
  hideLabels,
  onHover,
  onSelect,
}: LotsProps) {
  const lots = useMemo(
    () =>
      LOTE_GEOMS.map((geom) => ({
        geom,
        geometry: buildLotGeometry(geom),
        material: new THREE.MeshStandardMaterial({ roughness: 0.85 }),
        labelY: terrainHeight(geom.centro[0], geom.centro[1]) + LOT_TOP + 1.2,
      })),
    []
  );
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  useEffect(
    () => () => {
      for (const l of lots) {
        l.geometry.dispose();
        l.material.dispose();
      }
    },
    [lots]
  );

  useFrame((_, delta) => {
    lots.forEach((l, i) => {
      const unidad = unidadesByCodigo.get(l.geom.codigo);
      const isMatch = matches.has(l.geom.codigo);
      const isSelected = selected === l.geom.codigo;
      const isHovered = hovered === l.geom.codigo;
      const base = unidad && isMatch ? STATUS_COLORS[unidad.estado] : FILTERED_OUT_COLOR;
      l.material.color.set(base);
      l.material.emissive.set(isSelected || isHovered ? base : "#000000");
      l.material.emissiveIntensity = isSelected ? 0.45 : isHovered ? 0.25 : 0;
      const mesh = meshRefs.current[i];
      if (mesh) {
        const targetY = isSelected ? 0.9 : isHovered ? 0.35 : 0;
        mesh.position.y += (targetY - mesh.position.y) * Math.min(1, delta * 10);
      }
    });
  });

  return (
    <group>
      {lots.map((l, i) => {
        const showLabel =
          !hideLabels &&
          (showAllLabels || hovered === l.geom.codigo || selected === l.geom.codigo);
        const emphasized = hovered === l.geom.codigo || selected === l.geom.codigo;
        return (
          <group key={l.geom.codigo}>
            <mesh
              ref={(m) => {
                meshRefs.current[i] = m;
              }}
              name={l.geom.codigo}
              geometry={l.geometry}
              material={l.material}
              castShadow
              receiveShadow
              onPointerOver={(e: ThreeEvent<PointerEvent>) => {
                e.stopPropagation();
                onHover(l.geom.codigo, true);
              }}
              onPointerOut={() => onHover(l.geom.codigo, false)}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                onSelect(l.geom.codigo);
              }}
            />
            {/* Always mounted (mounting/unmounting Html roots mid-render warns); hidden via CSS. */}
            <Html
              position={[l.geom.centro[0], l.labelY, l.geom.centro[1]]}
              center
              zIndexRange={emphasized ? [30, 25] : [20, 0]}
              style={{ pointerEvents: "none", display: showLabel ? "block" : "none" }}
            >
              <span
                className={
                  emphasized
                    ? "whitespace-nowrap rounded-full bg-foreground px-2 py-0.5 font-mono text-[11px] text-background shadow"
                    : "whitespace-nowrap rounded-full bg-background/85 px-1.5 py-px font-mono text-[10px] text-foreground"
                }
              >
                {emphasized ? l.geom.codigo : l.geom.numero}
              </span>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

// ─── Amenities ───────────────────────────────────────────────────────────────

function groundY(x: number, z: number) {
  return terrainHeight(x, z);
}

function Box({
  position,
  size,
  color,
  opacity,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  opacity?: number;
}) {
  return (
    <mesh
      position={position}
      castShadow={opacity == null}
      receiveShadow
      raycast={() => null}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={opacity == null ? 0.85 : 0.1}
        transparent={opacity != null}
        opacity={opacity ?? 1}
      />
    </mesh>
  );
}

function ClubHouse() {
  const [x, z] = CLUB_HOUSE;
  const y = groundY(x, z);
  return (
    <group position={[x, y, z]}>
      <Box position={[0, 0.3, 0]} size={[40, 0.6, 20]} color="#e9e3d6" />
      <Box position={[-4, 3.2, -2]} size={[28, 5.2, 12]} color="#f4f0e7" />
      <Box
        position={[-4, 3.2, 4.1]}
        size={[26, 3.6, 0.2]}
        color="#aed3e0"
        opacity={0.55}
      />
      <Box position={[-4, 6.1, 0]} size={[32, 0.5, 17]} color="#c9c1b1" />
      <Box position={[10, 2.2, -3]} size={[8, 3.4, 8]} color="#d98f6c" />
      <mesh position={[8, 0.62, 14]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <planeGeometry args={[19, 8]} />
        <meshStandardMaterial color="#7fc4d8" roughness={0.1} />
      </mesh>
    </group>
  );
}

function PadelCourts() {
  return (
    <group>
      {CANCHAS_PADEL.map((c) => {
        const [x, z] = c.centro;
        const y = groundY(x, z) + 0.05;
        const h = 3;
        return (
          <group key={x} position={[x, y, z]}>
            <mesh
              position={[0, 0.05, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              raycast={() => null}
            >
              <planeGeometry args={[c.ancho, c.largo]} />
              <meshStandardMaterial color="#5f8fb3" roughness={0.9} />
            </mesh>
            <Box
              position={[0, h / 2, -c.largo / 2]}
              size={[c.ancho, h, 0.1]}
              color="#cfe6ef"
              opacity={0.35}
            />
            <Box
              position={[0, h / 2, c.largo / 2]}
              size={[c.ancho, h, 0.1]}
              color="#cfe6ef"
              opacity={0.35}
            />
            <Box
              position={[-c.ancho / 2, h / 2, 0]}
              size={[0.1, h, c.largo]}
              color="#cfe6ef"
              opacity={0.2}
            />
            <Box
              position={[c.ancho / 2, h / 2, 0]}
              size={[0.1, h, c.largo]}
              color="#cfe6ef"
              opacity={0.2}
            />
            <Box
              position={[0, 0.5, 0]}
              size={[c.ancho, 1, 0.05]}
              color="#f5f2eb"
              opacity={0.7}
            />
          </group>
        );
      })}
    </group>
  );
}

function Plaza() {
  const [x, z] = PLAZA.centro;
  const y = groundY(x, z);
  const posts: Vec2[] = [
    [-4, -4],
    [4, -4],
    [-4, 4],
    [4, 4],
  ];
  return (
    <group position={[x, y, z]}>
      {posts.map(([px, pz]) => (
        <Box
          key={`${px}${pz}`}
          position={[px, 1.4, pz]}
          size={[0.3, 2.8, 0.3]}
          color="#b9a78a"
        />
      ))}
      <Box position={[0, 2.9, 0]} size={[9.5, 0.25, 9.5]} color="#c9b895" />
    </group>
  );
}

function Guardia() {
  const [x, z] = GUARDIA;
  const y = groundY(x, z);
  return (
    <group position={[x, y, z]}>
      <Box position={[0, 1.6, 0]} size={[3.2, 3.2, 5]} color="#f4f0e7" />
      <Box position={[0, 3.35, 0]} size={[5, 0.3, 7]} color="#c9c1b1" />
      <Box position={[-4.5, 1.05, -4]} size={[7, 0.18, 0.18]} color="#d9726b" />
      <Box position={[4.5, 1.05, -4]} size={[7, 0.18, 0.18]} color="#d9726b" />
      <Box position={[-10.5, 1.5, -4]} size={[1.2, 3, 1.2]} color="#d3c9b6" />
      <Box position={[10.5, 1.5, -4]} size={[1.2, 3, 1.2]} color="#d3c9b6" />
      <Box position={[-24, 0.9, -4]} size={[26, 1.8, 0.4]} color="#d3c9b6" />
      <Box position={[24, 0.9, -4]} size={[26, 1.8, 0.4]} color="#d3c9b6" />
    </group>
  );
}

// ─── Trees ───────────────────────────────────────────────────────────────────

/** Keeps scattered trees off streets, blocks, water and amenities. */
function isFreeForTree(p: Vec2): boolean {
  const offset = (d: number): Vec2[] => [
    p,
    [p[0] + d, p[1]],
    [p[0] - d, p[1]],
    [p[0], p[1] + d],
    [p[0], p[1] - d],
  ];
  // Sample around the point so trunks don't stand on the curb.
  for (const q of offset(4)) {
    if (CALLES.some((calle) => pointInPolygon(q, calle))) return false;
    if (MANZANA_GEOMS.some((m) => pointInPolygon(q, m.poligono))) return false;
  }
  if (terrainHeight(p[0], p[1]) < NIVEL_AGUA + 0.6) return false;
  const near = (c: Vec2, r: number) => Math.hypot(p[0] - c[0], p[1] - c[1]) < r;
  if (near(CLUB_HOUSE, 30) || near(GUARDIA, 16) || near(PLAZA.centro, PLAZA.radio + 2)) {
    return false;
  }
  if (CANCHAS_PADEL.some((c) => near(c.centro, 16))) return false;
  return true;
}

function Trees({ isMobile }: { isMobile: boolean }) {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const crownRef = useRef<THREE.InstancedMesh>(null);

  const trees = useMemo(() => {
    const list: { p: Vec2; s: number; c: number }[] = [];
    // Rows along the entrance boulevard.
    for (let z = 128; z < 260; z += 11) {
      list.push({ p: [-13, z], s: 1, c: z });
      list.push({ p: [13, z], s: 1, c: z + 1 });
    }
    // Around the plaza.
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      list.push({
        p: [
          PLAZA.centro[0] + Math.cos(a) * (PLAZA.radio + 3),
          PLAZA.centro[1] + Math.sin(a) * (PLAZA.radio + 3),
        ],
        s: 1.1,
        c: i,
      });
    }
    // Scattered groves, denser near the neighbourhood's edge.
    const target = isMobile ? 220 : 420;
    for (let i = 0; list.length < target && i < 6000; i += 1) {
      const x = TERRENO.minX + 15 + seeded(i * 1.31) * (TERRENO.maxX - TERRENO.minX - 30);
      const z =
        TERRENO.minZ + 15 + seeded(i * 2.77 + 3) * (TERRENO.maxZ - TERRENO.minZ - 30);
      const p: Vec2 = [x, z];
      const edge = Math.max(Math.abs(x) - 190, Math.abs(z) - 110, 0);
      if (edge < 40 && seeded(i * 5.1) > 0.55) continue;
      if (!isFreeForTree(p)) continue;
      list.push({ p, s: 0.7 + seeded(i * 7.3) * 0.7, c: i });
    }
    return list;
  }, [isMobile]);

  useEffect(() => {
    const trunk = trunkRef.current;
    const crown = crownRef.current;
    if (!trunk || !crown) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const color = new THREE.Color();
    const greens = ["#8fae6a", "#7d9f5c", "#a3bb78", "#93b07a"];
    trees.forEach((t, i) => {
      const y = terrainHeight(t.p[0], t.p[1]);
      const s = t.s;
      m.compose(
        new THREE.Vector3(t.p[0], y + 1.5 * s, t.p[1]),
        q,
        new THREE.Vector3(s, s, s)
      );
      trunk.setMatrixAt(i, m);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), seeded(t.c * 3.3) * Math.PI);
      m.compose(
        new THREE.Vector3(t.p[0], y + 4.6 * s, t.p[1]),
        q,
        new THREE.Vector3(s * 2.6, s * 3, s * 2.6)
      );
      crown.setMatrixAt(i, m);
      q.identity();
      crown.setColorAt(
        i,
        color.set(greens[Math.floor(seeded(t.c * 9.1) * greens.length)])
      );
    });
    trunk.instanceMatrix.needsUpdate = true;
    crown.instanceMatrix.needsUpdate = true;
    if (crown.instanceColor) crown.instanceColor.needsUpdate = true;
  }, [trees]);

  return (
    <group>
      <instancedMesh
        ref={trunkRef}
        args={[undefined, undefined, trees.length]}
        castShadow
        raycast={() => null}
      >
        <cylinderGeometry args={[0.18, 0.25, 3, 5]} />
        <meshStandardMaterial color="#8b7355" roughness={1} />
      </instancedMesh>
      <instancedMesh
        ref={crownRef}
        args={[undefined, undefined, trees.length]}
        castShadow
        raycast={() => null}
      >
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
    </group>
  );
}

// ─── Labels for places ───────────────────────────────────────────────────────

const LUGARES: { label: string; p: Vec2; h: number }[] = [
  { label: "Laguna", p: [LAGUNA_CENTRO[0], LAGUNA_CENTRO[1]], h: 2 },
  { label: "Club house", p: CLUB_HOUSE, h: 10 },
  { label: "Canchas de pádel", p: CANCHAS_PADEL[1].centro, h: 6 },
  { label: "Plaza", p: PLAZA.centro, h: 6 },
  { label: "Acceso · Guardia", p: GUARDIA, h: 7 },
];

function PlaceLabels() {
  return (
    <>
      {LUGARES.map((l) => (
        <Html
          key={l.label}
          position={[l.p[0], terrainHeight(l.p[0], l.p[1]) + l.h, l.p[1]]}
          center
          zIndexRange={[10, 0]}
          style={{ pointerEvents: "none" }}
        >
          <span className="whitespace-nowrap rounded-full border border-border-subtle bg-background/90 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm">
            {l.label}
          </span>
        </Html>
      ))}
    </>
  );
}

// ─── Camera distance watcher ─────────────────────────────────────────────────

function useCloseUp(target: Viewpoint, onChange: (close: boolean) => void) {
  const { camera, controls } = useThree();
  const closeRef = useRef<boolean | null>(null);
  useFrame(() => {
    const orbitTarget =
      (controls as unknown as { target?: THREE.Vector3 } | null)?.target ??
      new THREE.Vector3(...target.target);
    const close = camera.position.distanceTo(orbitTarget) < LABELS_DISTANCE;
    if (close !== closeRef.current) {
      closeRef.current = close;
      onChange(close);
    }
  });
}

function CloseUpWatcher({
  target,
  onChange,
}: {
  target: Viewpoint;
  onChange: (close: boolean) => void;
}) {
  useCloseUp(target, onChange);
  return null;
}

// ─── Scene ───────────────────────────────────────────────────────────────────

export type LotesSceneProps = {
  unidadesByCodigo: Map<string, Unidad>;
  matches: Set<string>;
  hovered: string | null;
  selected: string | null;
  onHover: (codigo: string, hovering: boolean) => void;
  onSelect: (codigo: string) => void;
  cameraTarget: Viewpoint;
  cameraTargetKey: string;
  minDistance: number;
  maxDistance: number;
  isMobile: boolean;
  autoRotate: boolean;
  fogNear: number;
  fogFar: number;
  /** Hides the HTML labels (they would float over the 2D plan). */
  hideLabels?: boolean;
};

export function LotesScene(props: LotesSceneProps) {
  const [showAllLabels, setShowAllLabels] = useState(false);

  return (
    <>
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[SKY, props.fogNear, props.fogFar]} />
      <hemisphereLight args={["#f3f7fb", "#9a8f74", 0.9]} />
      <directionalLight
        position={[180, 260, 140]}
        intensity={2.1}
        color="#fff4e2"
        castShadow={!props.isMobile}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={10}
        shadow-camera-far={800}
        shadow-camera-left={-300}
        shadow-camera-right={300}
        shadow-camera-top={300}
        shadow-camera-bottom={-300}
        shadow-bias={-0.0005}
      />

      <Terrain />
      <Water />
      <Lots
        unidadesByCodigo={props.unidadesByCodigo}
        matches={props.matches}
        hovered={props.hovered}
        selected={props.selected}
        showAllLabels={showAllLabels}
        hideLabels={props.hideLabels}
        onHover={props.onHover}
        onSelect={props.onSelect}
      />
      <ClubHouse />
      <PadelCourts />
      <Plaza />
      <Guardia />
      <Trees isMobile={props.isMobile} />
      {props.hideLabels ? null : <PlaceLabels />}

      <CameraRig
        target={props.cameraTarget}
        targetKey={props.cameraTargetKey}
        autoRotateEnabled={props.autoRotate}
        autoRotateSpeed={0.25}
        minDistance={props.minDistance}
        maxDistance={props.maxDistance}
      />
      <CloseUpWatcher target={props.cameraTarget} onChange={setShowAllLabels} />
    </>
  );
}
