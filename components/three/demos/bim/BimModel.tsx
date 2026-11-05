"use client";

/* eslint-disable react-hooks/immutability, react-hooks/refs --
 * react-three-fiber mutates plain three.js objects (materials, meshes) imperatively in
 * useFrame; this is incompatible with the React Compiler's static mutation analysis by
 * design, and this project does not enable the compiler (no `reactCompiler` in next.config.ts).
 */

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { groupsByName, unidadFloor } from "@/lib/bim/dataset";
import type { Unidad } from "@/lib/unidades/types";
import {
  CATEGORY_COLORS,
  DEFAULT_CATEGORY_COLOR,
  GLASS_CATEGORIES,
} from "@/lib/bim/categories";
import { STATUS_COLORS } from "@/lib/units/status-colors";
import type { FloorRange } from "@/lib/bim/floors";

export type BimMode = "unidades" | "avance" | "corte";

const STRUCTURE_OPACITY_UNIDADES = 0.14;
const GLASS_OPACITY = 0.6;
const APARTMENT_IDLE_OPACITY = 0.6;
const APARTMENT_HOVER_OPACITY = 0.82;
const APARTMENT_SELECTED_OPACITY = 0.95;
// In "corte" the apartments are cut at plan height like the walls and tint the floor plan.
const CORTE_IDLE_OPACITY = 0.3;
const CORTE_HOVER_OPACITY = 0.55;
const CORTE_SELECTED_OPACITY = 0.75;

function NOOP_RAYCAST() {
  // Intentionally disables raycasting for this mesh.
}

type BimModelProps = {
  mode: BimMode;
  currentWeek: number;
  /** Slice of the model to keep visible (one isolated floor), or null for the whole building. */
  floorRange: FloorRange | null;
  /** Only this floor's apartments show in "unidades" mode; null shows all of them. */
  isolatedFloor: number | null;
  hoveredUnit: string | null;
  selectedUnit: string | null;
  /** Units keyed by 3D object name, for their status color. */
  unidadesByObjeto: Map<string, Unidad>;
  onUnitClick: (name: string) => void;
  onUnitHover: (name: string | null) => void;
  modelUrl?: string;
};

export function BimModel({
  mode,
  currentWeek,
  floorRange,
  isolatedFloor,
  hoveredUnit,
  selectedUnit,
  unidadesByObjeto,
  onUnitClick,
  onUnitHover,
  modelUrl = "/models/schependomlaan.glb",
}: BimModelProps) {
  const gltf = useLoader(GLTFLoader, modelUrl, (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder);
  });

  // Keeps y <= constant (top) and y >= -constant (bottom); both open by default.
  const topPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000));
  const bottomPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 1000));

  // Clone the loaded scene and give every mesh its own material (so recoloring never bleeds
  // across instances sharing a glTF material slot), once per loaded model.
  const { scene, structureMeshes, apartmentMeshes } = useMemo(() => {
    const clonedScene = gltf.scene.clone(true);
    const structures: THREE.Mesh[] = [];
    const apartments = new Map<string, THREE.Mesh>();

    clonedScene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;

      if (obj.name.startsWith("APT-")) {
        const material = new THREE.MeshStandardMaterial({
          flatShading: true,
          transparent: true,
          roughness: 0.8,
          depthWrite: false,
          clippingPlanes: [topPlaneRef.current, bottomPlaneRef.current],
        });
        obj.material = material;
        obj.castShadow = false;
        obj.receiveShadow = false;
        apartments.set(obj.name, obj);
        return;
      }

      const group = groupsByName.get(obj.name);
      const category = group?.cat ?? "otros";
      const isGlass = GLASS_CATEGORIES.has(category);
      const color = CATEGORY_COLORS[category] ?? DEFAULT_CATEGORY_COLOR;
      const material = new THREE.MeshStandardMaterial({
        color,
        flatShading: true,
        roughness: isGlass ? 0.15 : 0.9,
        metalness: isGlass ? 0.15 : 0,
        transparent: isGlass,
        opacity: isGlass ? GLASS_OPACITY : 1,
        clippingPlanes: [topPlaneRef.current, bottomPlaneRef.current],
      });
      material.userData.isGlass = isGlass;
      material.userData.baseOpacity = isGlass ? GLASS_OPACITY : 1;
      obj.material = material;
      obj.userData.week = group?.week ?? 0;
      obj.castShadow = true;
      obj.receiveShadow = true;
      structures.push(obj);
    });

    return {
      scene: clonedScene,
      structureMeshes: structures,
      apartmentMeshes: apartments,
    };
  }, [gltf]);

  // Mode/week/floor/hover-dependent updates run every frame (matching this codebase's convention
  // elsewhere, e.g. Lighting.tsx) rather than in an effect, since they mutate three.js objects
  // gathered above.
  useFrame(() => {
    const range = mode === "avance" ? null : floorRange;
    topPlaneRef.current.constant = range ? range.max : 1000;
    bottomPlaneRef.current.constant = range ? -range.min : 1000;

    for (const mesh of structureMeshes) {
      const material = mesh.material as THREE.MeshStandardMaterial;
      const baseOpacity = material.userData.baseOpacity as number;
      const isGlass = material.userData.isGlass as boolean;

      if (mode === "unidades" || mode === "corte") {
        // Walls must not swallow clicks meant for the apartment volumes inside them.
        mesh.raycast = NOOP_RAYCAST;
      } else {
        mesh.raycast = THREE.Mesh.prototype.raycast;
      }

      if (mode === "unidades") {
        material.transparent = true;
        material.opacity = STRUCTURE_OPACITY_UNIDADES;
        material.depthWrite = false;
        mesh.castShadow = false;
        mesh.visible = true;
      } else {
        material.transparent = isGlass;
        material.opacity = baseOpacity;
        material.depthWrite = true;
        mesh.castShadow = true;
        mesh.visible = mode === "corte" || (mesh.userData.week as number) <= currentWeek;
      }
    }

    apartmentMeshes.forEach((mesh, name) => {
      const material = mesh.material as THREE.MeshStandardMaterial;
      const unit = unidadesByObjeto.get(name);
      const unitFloor = unit ? unidadFloor(unit) : null;
      mesh.visible =
        mode !== "avance" && (isolatedFloor === null || unitFloor === isolatedFloor);
      // three.js raycasts hidden meshes too: only the shown floor may catch clicks.
      mesh.raycast = mesh.visible ? THREE.Mesh.prototype.raycast : NOOP_RAYCAST;
      const baseColor = unit ? STATUS_COLORS[unit.estado] : DEFAULT_CATEGORY_COLOR;
      const isHovered = hoveredUnit === name;
      const isSelected = selectedUnit === name;

      material.color.set(baseColor);
      if (mode === "corte") {
        // With the whole building shown, apartments stay invisible inside the walls but
        // still catch clicks; with one floor cut open they tint the plan.
        const idle = isolatedFloor === null ? 0 : CORTE_IDLE_OPACITY;
        material.opacity = isSelected
          ? CORTE_SELECTED_OPACITY
          : isHovered
            ? CORTE_HOVER_OPACITY
            : idle;
      } else {
        material.opacity = isSelected
          ? APARTMENT_SELECTED_OPACITY
          : isHovered
            ? APARTMENT_HOVER_OPACITY
            : APARTMENT_IDLE_OPACITY;
      }
      material.emissive.set(isHovered || isSelected ? baseColor : "#000000");
      material.emissiveIntensity = isSelected ? 0.35 : isHovered ? 0.2 : 0;
    });
  });

  function handlePointerMove(event: ThreeEvent<PointerEvent>) {
    if (!event.object.name.startsWith("APT-")) return;
    event.stopPropagation();
    onUnitHover(event.object.name);
  }

  function handlePointerOut(event: ThreeEvent<PointerEvent>) {
    if (!event.object.name.startsWith("APT-")) return;
    onUnitHover(null);
  }

  function handleClick(event: ThreeEvent<MouseEvent>) {
    if (!event.object.name.startsWith("APT-")) return;
    event.stopPropagation();
    onUnitClick(event.object.name);
  }

  return (
    <primitive
      object={scene}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    />
  );
}
