"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { BuildingConfig } from "@/lib/three/building-config";
import {
  type ArchMaterial,
  type ArchPart,
  STREET_NUMBER_PLATE,
  buildCatalunaParts,
} from "@/lib/three/cataluna-ii-parts";
import { addGlassVariation, addRenderTexture } from "@/components/three/visual/surface-detail";

/**
 * Cataluña II's architecture (street facade, ground floor, rooftop, rear) drawn from the
 * parts in `lib/three/cataluna-ii-parts.ts`: one merged mesh per level and material, so the
 * whole building is a few dozen draw calls and the floors above an isolated one can go.
 */

/** Colors read off page 1 of the brochure (daytime render). */
export const CATALUNA_PALETTE = {
  wall: "#e2e0db",
  frame: "#8e9092",
  white: "#f2f1ed",
  black: "#1c1d1f",
};

function createMaterials(): Record<ArchMaterial, THREE.Material> {
  const standard = (color: string, roughness: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, ...extra });
  return {
    // Lightly textured render: faint patches and a fine relief that catches grazing sun.
    wall: addRenderTexture(standard(CATALUNA_PALETTE.wall, 0.92)),
    frame: standard(CATALUNA_PALETTE.frame, 0.85),
    white: addRenderTexture(standard(CATALUNA_PALETTE.white, 0.85), { bump: 0.016 }),
    black: standard(CATALUNA_PALETTE.black, 0.45, { metalness: 0.5 }),
    // Float glass: each pane a little different, reflections slightly bent.
    glass: addGlassVariation(
      new THREE.MeshPhysicalMaterial({
        color: "#3b4952",
        roughness: 0.05,
        metalness: 0,
        ior: 1.52,
        envMapIntensity: 1.6,
      }),
    ),
    // White sheer curtains seen through the glass.
    curtain: standard("#eeede8", 0.55, { emissive: "#ffffff", emissiveIntensity: 0.12 }),
    dark: standard("#2c2e30", 0.95),
    deck: standard("#c9c6bf", 0.9),
    block: standard("#cfd0ce", 0.9),
    green: standard("#5a8a3c", 0.8),
    greenDark: standard("#3b6a2c", 0.85),
    trunk: standard("#7b6347", 0.9),
    planter: standard("#3a3b3d", 0.8),
    hall: standard("#efe3cf", 0.8, { emissive: "#f4d3a0", emissiveIntensity: 0.25 }),
    hallGlass: new THREE.MeshPhysicalMaterial({
      color: "#9aa4a8",
      roughness: 0.05,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      envMapIntensity: 1.4,
    }),
  };
}

const NO_SHADOW = new Set<ArchMaterial>(["glass", "curtain", "hallGlass", "hall"]);

const euler = new THREE.Euler();

function partGeometry(part: ArchPart): THREE.BufferGeometry {
  const s = part.shape;
  let geometry: THREE.BufferGeometry;
  switch (s.kind) {
    case "box": {
      const size = [s.max[0] - s.min[0], s.max[1] - s.min[1], s.max[2] - s.min[2]];
      geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
      geometry.translate(
        (s.min[0] + s.max[0]) / 2,
        (s.min[1] + s.max[1]) / 2,
        (s.min[2] + s.max[2]) / 2,
      );
      break;
    }
    case "obox":
      geometry = new THREE.BoxGeometry(...s.size);
      geometry.applyMatrix4(
        new THREE.Matrix4().makeRotationFromEuler(euler.set(s.rotation[0], s.rotation[1], s.rotation[2], "YZX")),
      );
      geometry.translate(...s.center);
      break;
    case "cyl":
      geometry = new THREE.CylinderGeometry(s.radius, s.radius, s.height, 16);
      geometry.translate(...s.center);
      break;
    case "blob":
      geometry = new THREE.IcosahedronGeometry(s.radius, 1);
      geometry.translate(...s.center);
      break;
  }
  // Mixed indexed (box, cylinder) and non-indexed (icosahedron) geometries can't be merged.
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  if (flat !== geometry) geometry.dispose();
  return flat;
}

type LevelMesh = { level: number; material: ArchMaterial; geometry: THREE.BufferGeometry };

function buildLevelMeshes(config: BuildingConfig): LevelMesh[] {
  const groups = new Map<string, ArchPart[]>();
  for (const part of buildCatalunaParts(config)) {
    const key = `${part.level}|${part.material}`;
    const list = groups.get(key);
    if (list) list.push(part);
    else groups.set(key, [part]);
  }
  const meshes: LevelMesh[] = [];
  for (const [key, list] of groups) {
    const [level, material] = key.split("|");
    const pieces = list.map(partGeometry);
    const geometry = mergeGeometries(pieces, false);
    pieces.forEach((g) => g.dispose());
    if (geometry) meshes.push({ level: Number(level), material: material as ArchMaterial, geometry });
  }
  return meshes;
}

/** The street number "2771", stacked vertically like on the entrance pier. */
function useStreetNumberTexture() {
  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 460;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = CATALUNA_PALETTE.white;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#5b5d60";
    ctx.font = "300 92px 'Helvetica Neue', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    STREET_NUMBER_PLATE.text.split("").forEach((digit, i, all) => {
      ctx.fillText(digit, canvas.width / 2, ((i + 0.5) / all.length) * canvas.height);
    });
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, []);
  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

export function CatalunaArchitecture({
  config,
  topFloor,
  roofVisible,
  castShadow,
}: {
  config: BuildingConfig;
  /** Floors above this one are not drawn (an isolated floor). */
  topFloor: number;
  roofVisible: boolean;
  castShadow: boolean;
}) {
  const meshes = useMemo(() => buildLevelMeshes(config), [config]);
  const materials = useMemo(() => createMaterials(), []);
  const numberTexture = useStreetNumberTexture();

  useEffect(
    () => () => {
      meshes.forEach((m) => m.geometry.dispose());
    },
    [meshes],
  );
  useEffect(
    () => () => {
      Object.values(materials).forEach((m) => m.dispose());
    },
    [materials],
  );

  const roofLevel = config.floors + 1;
  return (
    <group>
      {meshes.map((m) => {
        const visible = m.level === roofLevel ? roofVisible : m.level <= topFloor;
        if (!visible) return null;
        return (
          <mesh
            key={`${m.level}-${m.material}`}
            geometry={m.geometry}
            material={materials[m.material]}
            castShadow={castShadow && !NO_SHADOW.has(m.material)}
            receiveShadow
            raycast={() => null}
          />
        );
      })}
      {numberTexture ? (
        <mesh
          position={[STREET_NUMBER_PLATE.center[0], STREET_NUMBER_PLATE.center[1], STREET_NUMBER_PLATE.z]}
          raycast={() => null}
        >
          <planeGeometry args={STREET_NUMBER_PLATE.size} />
          <meshStandardMaterial map={numberTexture} roughness={0.85} />
        </mesh>
      ) : null}
    </group>
  );
}
