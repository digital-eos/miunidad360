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
import { groupsByName, bimUnitsByName } from "@/lib/bim/dataset";
import { CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR, GLASS_CATEGORIES } from "@/lib/bim/categories";
import { STATUS_COLORS } from "@/lib/units/status-colors";

export type BimMode = "unidades" | "avance" | "corte";

const STRUCTURE_OPACITY_UNIDADES = 0.14;
const GLASS_OPACITY = 0.6;
const APARTMENT_IDLE_OPACITY = 0.6;
const APARTMENT_HOVER_OPACITY = 0.82;
const APARTMENT_SELECTED_OPACITY = 0.95;

function NOOP_RAYCAST() {
  // Intentionally disables raycasting for this mesh.
}

type BimModelProps = {
  mode: BimMode;
  currentWeek: number;
  cutHeight: number;
  hoveredUnit: string | null;
  selectedUnit: string | null;
  onUnitClick: (name: string) => void;
  onUnitHover: (name: string | null) => void;
};

export function BimModel({
  mode,
  currentWeek,
  cutHeight,
  hoveredUnit,
  selectedUnit,
  onUnitClick,
  onUnitHover,
}: BimModelProps) {
  const gltf = useLoader(GLTFLoader, "/models/schependomlaan.glb", (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder);
  });

  const clipPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000));

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
        clippingPlanes: [clipPlaneRef.current],
      });
      material.userData.isGlass = isGlass;
      material.userData.baseOpacity = isGlass ? GLASS_OPACITY : 1;
      obj.material = material;
      obj.userData.week = group?.week ?? 0;
      obj.castShadow = true;
      obj.receiveShadow = true;
      structures.push(obj);
    });

    return { scene: clonedScene, structureMeshes: structures, apartmentMeshes: apartments };
  }, [gltf]);

  // Mode/week/cut/hover-dependent updates run every frame (matching this codebase's convention
  // elsewhere, e.g. Lighting.tsx) rather than in an effect, since they mutate three.js objects
  // gathered above.
  useFrame(() => {
    clipPlaneRef.current.constant = mode === "corte" ? cutHeight : 1000;

    for (const mesh of structureMeshes) {
      const material = mesh.material as THREE.MeshStandardMaterial;
      const baseOpacity = material.userData.baseOpacity as number;
      const isGlass = material.userData.isGlass as boolean;

      if (mode === "unidades") {
        material.transparent = true;
        material.opacity = STRUCTURE_OPACITY_UNIDADES;
        material.depthWrite = false;
        mesh.castShadow = false;
        mesh.visible = true;
        // Structure is near-invisible in this mode; don't let it intercept clicks meant for
        // the apartment volumes behind it.
        mesh.raycast = NOOP_RAYCAST;
      } else {
        material.transparent = isGlass;
        material.opacity = baseOpacity;
        material.depthWrite = true;
        mesh.castShadow = true;
        mesh.visible = mode === "corte" || (mesh.userData.week as number) <= currentWeek;
        mesh.raycast = THREE.Mesh.prototype.raycast;
      }
    }

    apartmentMeshes.forEach((mesh, name) => {
      mesh.visible = mode === "unidades";
      const material = mesh.material as THREE.MeshStandardMaterial;
      const unit = bimUnitsByName.get(name);
      const baseColor = unit ? STATUS_COLORS[unit.status] : DEFAULT_CATEGORY_COLOR;
      const isHovered = hoveredUnit === name;
      const isSelected = selectedUnit === name;

      material.color.set(baseColor);
      material.opacity = isSelected
        ? APARTMENT_SELECTED_OPACITY
        : isHovered
          ? APARTMENT_HOVER_OPACITY
          : APARTMENT_IDLE_OPACITY;
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
