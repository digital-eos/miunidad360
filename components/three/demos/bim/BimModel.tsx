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
import { Html } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { groupsByName, unidadFloor } from "@/lib/bim/dataset";
import type { Unidad } from "@/lib/unidades/types";
import { DEFAULT_CATEGORY_COLOR } from "@/lib/bim/categories";
import { STATUS_COLORS } from "@/lib/units/status-colors";
import { floorAtHeight, floorRevealCut, type FloorRange } from "@/lib/bim/floors";
import exteriorFaces from "@/lib/bim/exterior-faces.json";
import {
  bimMaterialKind,
  createRevealDepthMaterial,
  createRevealUniforms,
  createStructureMaterial,
  EXTERIOR_ATTRIBUTE,
} from "./bim-materials";

/** Per wall mesh, one bit per triangle: 1 when it faces outside (brick). */
const EXTERIOR_FACES: Record<string, string | undefined> = exteriorFaces;

/**
 * Unindexed copy of a wall geometry with the per-vertex exterior flag the wall material
 * reads. Unindexed so a brick face never shares a vertex with a plaster one.
 */
function withExteriorFaces(
  geometry: THREE.BufferGeometry,
  bitsBase64: string | undefined
): THREE.BufferGeometry {
  const bits = bitsBase64
    ? Uint8Array.from(atob(bitsBase64), (ch) => ch.charCodeAt(0))
    : new Uint8Array(0);
  const flat = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const vertexCount = flat.attributes.position.count;
  const exterior = new Float32Array(vertexCount);
  for (let v = 0; v < vertexCount; v++) {
    const triangle = Math.floor(v / 3);
    exterior[v] = (bits[triangle >> 3] >> (triangle & 7)) & 1;
  }
  flat.setAttribute(EXTERIOR_ATTRIBUTE, new THREE.BufferAttribute(exterior, 1));  return flat;
}

export type BimMode = "unidades" | "avance" | "corte";

// Picked floor in "unidades": volumes colored by status.
const APARTMENT_IDLE_OPACITY = 0.55;
const APARTMENT_HOVER_OPACITY = 0.72;
const APARTMENT_SELECTED_OPACITY = 0.85;
// In "corte" the apartments are cut at plan height like the walls and tint the floor plan.
const CORTE_IDLE_OPACITY = 0.3;
const CORTE_HOVER_OPACITY = 0.55;
const CORTE_SELECTED_OPACITY = 0.75;

// Floors above the picked one rise this much while they dissolve.
const REVEAL_LIFT_M = 4;
const REVEAL_DURATION_S = 0.6;
// Façade tags fading in after the homepage intro.
const TAGS_FADE_S = 0.6;
// A drag that ends on the building is not a click on a floor.
const CLICK_MAX_DRAG_PX = 6;

function NOOP_RAYCAST() {
  // Intentionally disables raycasting for this mesh.
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

type UnitTag = {
  name: string;
  position: THREE.Vector3;
  /** Outward normal of the façade the tag sits on. */
  normal: THREE.Vector3;
};

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
  /** Whole building in "unidades": a click on the façade picks the floor at that height. */
  onFloorClick?: (floor: number) => void;
  /** Camera distances between which the façade tags fade out. */
  tagFade: { start: number; end: number };
  reducedMotion?: boolean;
  /** Keeps the façade tags hidden (homepage intro); they fade in once it turns false. */
  tagsHidden?: boolean;
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
  onFloorClick,
  tagFade,
  reducedMotion = false,
  tagsHidden = false,
  modelUrl = "/models/schependomlaan.glb",
}: BimModelProps) {
  const gltf = useLoader(GLTFLoader, modelUrl, (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder);
  });

  // Keeps y <= constant (top) and y >= -constant (bottom); both open by default.
  const topPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000));
  const bottomPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 1000));
  const revealRef = useRef({ progress: 0, cut: 1000, shownFloor: null as number | null });
  const tagElementsRef = useRef(new Map<string, HTMLButtonElement>());
  const tagsShownRef = useRef(tagsHidden ? 0 : 1);

  // Clone the loaded scene and give every mesh its own material (so recoloring never bleeds
  // across instances sharing a glTF material slot), once per loaded model.
  const { scene, structureMeshes, apartmentMeshes, uniforms, tags } = useMemo(() => {
    const clonedScene = gltf.scene.clone(true);
    clonedScene.updateMatrixWorld(true);
    const clipping = [topPlaneRef.current, bottomPlaneRef.current];
    const revealUniforms = createRevealUniforms();
    const depthMaterial = createRevealDepthMaterial(revealUniforms, clipping);
    const structures: THREE.Mesh[] = [];
    const apartments = new Map<string, THREE.Mesh>();

    clonedScene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;

      if (obj.name.startsWith("APT-")) {
        const material = new THREE.MeshStandardMaterial({
          transparent: true,
          roughness: 0.8,
          depthWrite: false,
          clippingPlanes: clipping,
        });
        obj.material = material;
        obj.castShadow = false;
        obj.receiveShadow = false;
        const outline = new THREE.LineSegments(
          new THREE.EdgesGeometry(obj.geometry, 25),
          new THREE.LineBasicMaterial({
            transparent: true,
            depthWrite: false,
            clippingPlanes: clipping,
          })
        );
        outline.raycast = NOOP_RAYCAST;
        outline.renderOrder = 1;
        obj.add(outline);
        obj.userData.outline = outline;
        apartments.set(obj.name, obj);
        return;
      }

      const group = groupsByName.get(obj.name);
      const category = group?.cat ?? "otros";
      const original = obj.material as THREE.MeshStandardMaterial;
      const originalHex = original.color?.getHexString() ?? "";
      obj.material = createStructureMaterial(
        bimMaterialKind(category, originalHex),
        revealUniforms,
        clipping
      );
      const material = obj.material as THREE.MeshStandardMaterial;
      if (material.userData.kind === "wall") {
        obj.geometry = withExteriorFaces(obj.geometry, EXTERIOR_FACES[obj.name]);
      }
      if (!material.flatShading && !obj.geometry.attributes.normal) {
        // Smooth curved parts, keep sharp edges sharp.
        obj.geometry = toCreasedNormals(obj.geometry, Math.PI / 6);
      }
      obj.customDepthMaterial = depthMaterial;
      obj.userData.week = group?.week ?? 0;
      obj.castShadow = true;
      obj.receiveShadow = true;
      structures.push(obj);
    });

    // One tag per unit, on the outer face of its volume closest to the building's edge.
    const bounds = new THREE.Box3().setFromObject(clonedScene);
    const unitTags: UnitTag[] = [];
    apartments.forEach((mesh, name) => {
      const box = new THREE.Box3().setFromObject(mesh);
      const center = box.getCenter(new THREE.Vector3());
      const faces = [
        { gap: bounds.max.x - box.max.x, normal: new THREE.Vector3(1, 0, 0) },
        { gap: box.min.x - bounds.min.x, normal: new THREE.Vector3(-1, 0, 0) },
        { gap: bounds.max.z - box.max.z, normal: new THREE.Vector3(0, 0, 1) },
        { gap: box.min.z - bounds.min.z, normal: new THREE.Vector3(0, 0, -1) },
      ];
      const face = faces.reduce((a, b) => (b.gap < a.gap ? b : a));
      const position = center.clone();
      // Just outside the façade line, so the tag never sinks into the brick.
      if (face.normal.x !== 0) {
        position.x = face.normal.x > 0 ? bounds.max.x + 0.3 : bounds.min.x - 0.3;
      } else {
        position.z = face.normal.z > 0 ? bounds.max.z + 0.3 : bounds.min.z - 0.3;
      }
      unitTags.push({ name, position, normal: face.normal });
    });

    return {
      scene: clonedScene,
      structureMeshes: structures,
      apartmentMeshes: apartments,
      uniforms: revealUniforms,
      tags: unitTags,
    };
  }, [gltf]);

  const tmp = useMemo(() => new THREE.Vector3(), []);

  // Mode/week/floor/hover-dependent updates run every frame (matching this codebase's convention
  // elsewhere, e.g. Lighting.tsx) rather than in an effect, since they mutate three.js objects
  // gathered above.
  useFrame(({ camera }, delta) => {
    const range = mode === "corte" ? floorRange : null;
    topPlaneRef.current.constant = range ? range.max : 1000;
    bottomPlaneRef.current.constant = range ? -range.min : 1000;

    // Floor reveal: what sits above the picked floor rises and dissolves.
    const reveal = revealRef.current;
    const pickedFloor = mode === "unidades" ? isolatedFloor : null;
    const targetCut = pickedFloor === null ? null : floorRevealCut(pickedFloor);
    const target = targetCut === null ? 0 : 1;
    if (targetCut !== null) {
      if (reveal.progress === 0 || reducedMotion) reveal.cut = targetCut;
      else reveal.cut += (targetCut - reveal.cut) * Math.min(1, delta * 8);
      reveal.shownFloor = pickedFloor;
    }
    const step = reducedMotion ? 1 : delta / REVEAL_DURATION_S;
    reveal.progress =
      target > reveal.progress
        ? Math.min(target, reveal.progress + step)
        : Math.max(target, reveal.progress - step);
    const eased = easeInOutCubic(reveal.progress);
    uniforms.uBimCut.value = reveal.progress > 0 ? reveal.cut : 1000;
    uniforms.uBimLift.value = eased * REVEAL_LIFT_M;
    uniforms.uBimFade.value = eased;

    // Walls must not swallow clicks meant for the apartment volumes inside them; on the whole
    // building in "unidades" they pick a floor instead.
    const structureClickable =
      mode === "avance" ||
      (mode === "unidades" && isolatedFloor === null && reveal.progress < 0.5);
    for (const mesh of structureMeshes) {
      mesh.raycast = structureClickable ? THREE.Mesh.prototype.raycast : NOOP_RAYCAST;
      mesh.visible = mode !== "avance" || (mesh.userData.week as number) <= currentWeek;
    }

    apartmentMeshes.forEach((mesh, name) => {
      const material = mesh.material as THREE.MeshStandardMaterial;
      const outline = mesh.userData.outline as THREE.LineSegments;
      const outlineMaterial = outline.material as THREE.LineBasicMaterial;
      const unit = unidadesByObjeto.get(name);
      const unitFloor = unit ? unidadFloor(unit) : null;
      const baseColor = unit ? STATUS_COLORS[unit.estado] : DEFAULT_CATEGORY_COLOR;
      const isHovered = hoveredUnit === name;
      const isSelected = selectedUnit === name;

      let opacity: number;
      if (mode === "corte") {
        // With the whole building shown, apartments stay invisible inside the walls but
        // still catch clicks; with one floor cut open they tint the plan.
        const idle = isolatedFloor === null ? 0 : CORTE_IDLE_OPACITY;
        opacity = isSelected
          ? CORTE_SELECTED_OPACITY
          : isHovered
            ? CORTE_HOVER_OPACITY
            : idle;
        mesh.visible = isolatedFloor === null || unitFloor === isolatedFloor;
      } else if (mode === "unidades") {
        // Whole building: no volumes, the façade tags stand in for them.
        const level = isSelected
          ? APARTMENT_SELECTED_OPACITY
          : isHovered
            ? APARTMENT_HOVER_OPACITY
            : APARTMENT_IDLE_OPACITY;
        opacity = level * eased;
        mesh.visible = unitFloor === reveal.shownFloor && reveal.progress > 0;
      } else {
        opacity = 0;
        mesh.visible = false;
      }

      const clickable = mesh.visible && (mode === "corte" || reveal.progress > 0.5);
      // three.js raycasts hidden meshes too: only the shown floor may catch clicks.
      mesh.raycast = clickable ? THREE.Mesh.prototype.raycast : NOOP_RAYCAST;

      material.color.set(baseColor);
      material.opacity = opacity;
      material.emissive.set(isHovered || isSelected ? baseColor : "#000000");
      material.emissiveIntensity = isSelected ? 0.35 : isHovered ? 0.2 : 0;
      outlineMaterial.color.set(baseColor).multiplyScalar(0.55);
      outlineMaterial.opacity = opacity > 0 ? Math.min(1, opacity * 1.5) : 0;
      outline.visible = opacity > 0.01;
    });

    // Façade tags: whole building only, fading with distance and when facing away.
    const tagsTarget = tagsHidden ? 0 : 1;
    const tagsStep = reducedMotion ? 1 : delta / TAGS_FADE_S;
    tagsShownRef.current =
      tagsTarget > tagsShownRef.current
        ? Math.min(tagsTarget, tagsShownRef.current + tagsStep)
        : Math.max(tagsTarget, tagsShownRef.current - tagsStep);
    const tagsShown = (mode === "unidades" ? 1 - eased : 0) * tagsShownRef.current;
    for (const tag of tags) {
      const el = tagElementsRef.current.get(tag.name);
      if (!el) continue;
      tmp.copy(camera.position).sub(tag.position);
      const distance = tmp.length();
      const facing = smoothstep(-0.1, 0.3, tmp.normalize().dot(tag.normal));
      const near = 1 - smoothstep(tagFade.start, tagFade.end, distance);
      const opacity = tagsShown * facing * near;
      el.style.opacity = opacity.toFixed(3);
      el.style.visibility = opacity < 0.02 ? "hidden" : "visible";
      el.style.pointerEvents = opacity > 0.35 ? "auto" : "none";
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
    if (!event.object.name.startsWith("APT-")) {
      if (mode !== "unidades" || isolatedFloor !== null || !onFloorClick) return;
      if (event.delta > CLICK_MAX_DRAG_PX) return;
      event.stopPropagation();
      const floor = floorAtHeight(event.point.y);
      if (floor !== null) onFloorClick(floor);
      return;
    }
    event.stopPropagation();
    onUnitClick(event.object.name);
  }

  return (
    <>
      <primitive
        object={scene}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      />
      {tags.map((tag) => {
        const unit = unidadesByObjeto.get(tag.name);
        if (!unit) return null;
        return (
          <Html key={tag.name} position={tag.position} center zIndexRange={[20, 0]}>
            <button
              type="button"
              ref={(el) => {
                if (el) tagElementsRef.current.set(tag.name, el);
                else tagElementsRef.current.delete(tag.name);
              }}
              onClick={() => onUnitClick(tag.name)}
              onPointerEnter={() => onUnitHover(tag.name)}
              onPointerLeave={() => onUnitHover(null)}
              style={{ opacity: 0, visibility: "hidden" }}
              className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md border border-border-subtle bg-surface py-0.5 pr-2 pl-1.5 tabular-nums text-[10px] font-medium leading-4 text-foreground shadow-sm transition-colors duration-150 select-none hover:border-primary"
              aria-label={`Ver ${unit.codigo}`}
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[unit.estado] }}
              />
              {unit.codigo}
            </button>
          </Html>
        );
      })}
    </>
  );
}
