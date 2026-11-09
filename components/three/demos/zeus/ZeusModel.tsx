"use client";

/* eslint-disable react-hooks/immutability --
 * react-three-fiber mutates three.js objects (materials, groups) imperatively in useFrame.
 */

import { useMemo } from "react";
import * as THREE from "three";
import { useFrame, useLoader, type ThreeEvent } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { STATUS_COLORS } from "@/lib/units/status-colors";
import type { Unidad } from "@/lib/unidades/types";
import { floorAtHeight, meshFloor, ZEUS_MODEL_URL } from "@/lib/zeus/dataset";

// Units over the whole building: tinted glass boxes behind the railings.
const UNIT_IDLE_OPACITY = 0.28;
// Units of the isolated floor.
const UNIT_FLOOR_OPACITY = 0.5;
const UNIT_HOVER_OPACITY = 0.7;
const UNIT_SELECTED_OPACITY = 0.82;
// Floors above the picked one rise and dissolve.
const LIFT_M = 5;
const FADE_S = 0.55;
// A drag that ends on the building is not a click.
const CLICK_MAX_DRAG_PX = 6;

function NOOP_RAYCAST() {
  // Intentionally disables raycasting for this mesh.
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

type Level = {
  floor: number;
  group: THREE.Group;
  materials: THREE.MeshStandardMaterial[];
  /** 0 = in place and opaque, 1 = lifted and gone. */
  hidden: number;
};

type UnitMesh = {
  name: string;
  floor: number;
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  outline: THREE.LineSegments;
};

function structureMaterial(kind: string): THREE.MeshStandardMaterial {
  if (kind === "baranda") {
    return new THREE.MeshStandardMaterial({
      color: "#b7d0dc",
      roughness: 0.08,
      metalness: 0.1,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }
  return new THREE.MeshStandardMaterial({
    color: kind === "losa" || kind === "zocalo" ? "#e4e0d8" : "#f5f3ee",
    roughness: 0.92,
  });
}

type ZeusModelProps = {
  /** Isolated floor, or null for the whole building. */
  floor: number | null;
  hoveredUnit: string | null;
  selectedUnit: string | null;
  unidadesByObjeto: Map<string, Unidad>;
  onUnitHover: (name: string | null) => void;
  onUnitClick: (name: string) => void;
  /** Whole building: a click on the façade picks the floor at that height. */
  onFloorClick: (floor: number) => void;
  reducedMotion?: boolean;
};

export function ZeusModel({
  floor,
  hoveredUnit,
  selectedUnit,
  unidadesByObjeto,
  onUnitHover,
  onUnitClick,
  onFloorClick,
  reducedMotion = false,
}: ZeusModelProps) {
  const gltf = useLoader(GLTFLoader, ZEUS_MODEL_URL);

  // One group per floor (so floors above the picked one can lift away), own materials per
  // floor (so they can fade), and the unit volumes kept apart.
  const { root, levels, units, structures } = useMemo(() => {
    const scene = gltf.scene.clone(true);
    const rootGroup = new THREE.Group();
    const byFloor = new Map<number, Level>();
    const unitMeshes: UnitMesh[] = [];
    const structureMeshes: THREE.Mesh[] = [];
    const meshes: THREE.Mesh[] = [];
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) meshes.push(obj);
    });

    const levelFor = (n: number) => {
      let level = byFloor.get(n);
      if (!level) {
        level = { floor: n, group: new THREE.Group(), materials: [], hidden: 0 };
        level.group.name = `nivel-${n}`;
        byFloor.set(n, level);
        rootGroup.add(level.group);
      }
      return level;
    };

    for (const mesh of meshes) {
      mesh.updateWorldMatrix(true, false);
      mesh.geometry.applyMatrix4(mesh.matrixWorld);
      mesh.position.set(0, 0, 0);
      mesh.rotation.set(0, 0, 0);
      mesh.scale.set(1, 1, 1);
      const n = meshFloor(mesh.name) ?? 0;
      const level = levelFor(n);

      if (mesh.name.startsWith("APT-")) {
        const material = new THREE.MeshStandardMaterial({
          transparent: true,
          roughness: 0.6,
          depthWrite: false,
        });
        mesh.material = material;
        const outline = new THREE.LineSegments(
          new THREE.EdgesGeometry(mesh.geometry, 25),
          new THREE.LineBasicMaterial({ transparent: true, depthWrite: false })
        );
        outline.raycast = NOOP_RAYCAST;
        mesh.add(outline);
        mesh.renderOrder = 2;
        level.group.add(mesh);
        unitMeshes.push({ name: mesh.name, floor: n, mesh, material, outline });
        continue;
      }

      const kind = /-(\w+)$/.exec(mesh.name)?.[1] ?? mesh.name;
      const material = structureMaterial(kind);
      mesh.material = material;
      mesh.castShadow = kind !== "baranda";
      mesh.receiveShadow = true;
      mesh.userData.floor = n;
      level.materials.push(material);
      level.group.add(mesh);
      structureMeshes.push(mesh);
    }

    return {
      root: rootGroup,
      levels: [...byFloor.values()].sort((a, b) => a.floor - b.floor),
      units: unitMeshes,
      structures: structureMeshes,
    };
  }, [gltf]);

  useFrame((_, delta) => {
    const step = reducedMotion ? 1 : delta / FADE_S;

    for (const level of levels) {
      const target = floor !== null && level.floor > floor ? 1 : 0;
      level.hidden =
        target > level.hidden
          ? Math.min(target, level.hidden + step)
          : Math.max(target, level.hidden - step);
      const eased = easeInOutCubic(level.hidden);
      // Higher floors lift a little further, like a stack of trays opening.
      const above = floor === null ? 0 : level.floor - floor;
      level.group.position.y = eased * LIFT_M * Math.max(1, above * 0.6);
      level.group.visible = level.hidden < 0.999;
      for (const material of level.materials) {
        const base = material.userData.baseOpacity ?? (material.transparent ? material.opacity : 1);
        material.userData.baseOpacity = base;
        material.opacity = base * (1 - eased);
        material.transparent = base < 1 || eased > 0;
        material.depthWrite = !material.transparent || base >= 1;
      }
    }

    for (const unit of units) {
      const record = unidadesByObjeto.get(unit.name);
      const color = record ? STATUS_COLORS[record.estado] : "#9aa3a8";
      const isHovered = hoveredUnit === unit.name;
      const isSelected = selectedUnit === unit.name;
      const onFloor = floor === null || unit.floor === floor;

      let opacity = floor === null ? UNIT_IDLE_OPACITY : onFloor ? UNIT_FLOOR_OPACITY : 0;
      if (onFloor && isHovered) opacity = UNIT_HOVER_OPACITY;
      if (onFloor && isSelected) opacity = UNIT_SELECTED_OPACITY;

      unit.mesh.visible = opacity > 0;
      unit.mesh.raycast = unit.mesh.visible ? THREE.Mesh.prototype.raycast : NOOP_RAYCAST;
      unit.material.color.set(color);
      unit.material.opacity = opacity;
      unit.material.emissive.set(isHovered || isSelected ? color : "#000000");
      unit.material.emissiveIntensity = isSelected ? 0.4 : isHovered ? 0.25 : 0;
      const outlineMaterial = unit.outline.material as THREE.LineBasicMaterial;
      outlineMaterial.color.set(color).multiplyScalar(0.6);
      outlineMaterial.opacity = Math.min(1, opacity * 1.4);
    }

    // With one floor open, the structure must not swallow clicks meant for its units.
    for (const mesh of structures) {
      mesh.raycast = floor === null ? THREE.Mesh.prototype.raycast : NOOP_RAYCAST;
    }
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
    if (event.delta > CLICK_MAX_DRAG_PX) return;
    event.stopPropagation();
    if (event.object.name.startsWith("APT-")) {
      onUnitClick(event.object.name);
      return;
    }
    if (floor === null) onFloorClick(floorAtHeight(event.point.y));
  }

  return (
    <primitive
      object={root}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    />
  );
}
