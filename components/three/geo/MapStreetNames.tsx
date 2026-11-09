"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { SITE } from "@/lib/geo/site";
import type { MapBlend } from "./MapGround";
import { streetProfile } from "./MapStreets";
import { STREET_LAYER } from "./street-material";

/**
 * Street names on the asphalt, in the site's caption style (IBM Plex Mono, tracked capitals),
 * replacing the Google labels the streets now cover. One label per block, centered on the
 * road, the same name never twice within LABEL_SPACING. All names share one canvas atlas and
 * one draw call. Each label turns 180° when the camera passes to its other side, so it never
 * reads upside down. Painted: lit by the sun, shaded by the buildings, fades with distance.
 * Same frame as MapBuildings: +X east, −Z north, turned to the facade bearing.
 */

const DATA_URL = "/geo/streets/cataluna-ii.json";
const DEG = Math.PI / 180;
/** Minimum distance between two labels of the same street (m). */
const LABEL_SPACING = 140;
/** Atlas: one row per name. */
const ATLAS_WIDTH = 2048;
const ROW_HEIGHT = 72;
const FONT_PX = 46;
const TRACKING_PX = 9;

type Way = { k: string; n: string | null; o: 0 | 1; w: number | null; p: [number, number][] };
type Label = {
  name: string;
  /** Center and direction in the map frame (east, north). */
  x: number;
  y: number;
  dx: number;
  dy: number;
  /** Letter height (m). */
  height: number;
};

/**
 * Text length in meters for a letter height: a mono glyph is ~0.6 em plus the tracking (0.2 em),
 * and capitals are ~0.72 em tall, so each character takes ~1.1 letter heights.
 */
const lengthFor = (name: string, height: number) => name.length * height * 1.15;

function placeLabels(ways: Way[], radius: number): Label[] {
  const named = ways.filter((w) => w.n && w.k !== "pedestrian");
  const candidates: (Label & { distance: number })[] = [];
  for (const way of named) {
    const { half } = streetProfile(way);
    const height = THREE.MathUtils.clamp(half * 0.44, 1.75, 2.8);
    const name = way.n!.toUpperCase();
    for (let i = 0; i < way.p.length - 1; i++) {
      const [x0, y0] = way.p[i];
      const [x1, y1] = way.p[i + 1];
      const length = Math.hypot(x1 - x0, y1 - y0);
      // Room for the name with the zebra crossings clear at both ends.
      if (length < lengthFor(name, height) + 24) continue;
      const x = (x0 + x1) / 2;
      const y = (y0 + y1) / 2;
      const distance = Math.hypot(x, y);
      if (distance > radius) continue;
      candidates.push({ name, x, y, dx: (x1 - x0) / length, dy: (y1 - y0) / length, height, distance });
    }
  }
  // Nearest blocks first, so the tower's own street gets its label.
  candidates.sort((a, b) => a.distance - b.distance);
  const labels: Label[] = [];
  for (const c of candidates) {
    const crowded = labels.some(
      (l) => l.name === c.name && Math.hypot(l.x - c.x, l.y - c.y) < LABEL_SPACING,
    );
    if (!crowded) labels.push(c);
  }
  return labels;
}

/** The site's mono font, as next/font registered it. */
function monoFamily() {
  const read = (el: Element) => getComputedStyle(el).getPropertyValue("--font-plex-mono").trim();
  return read(document.documentElement) || read(document.body) || "monospace";
}

async function drawAtlas(names: string[]) {
  const family = monoFamily();
  const font = `500 ${FONT_PX}px ${family}`;
  await document.fonts.load(font).catch(() => undefined);
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_WIDTH;
  canvas.height = Math.max(1, names.length) * ROW_HEIGHT;
  const ctx = canvas.getContext("2d")!;
  ctx.font = font;
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  const widths: number[] = [];
  names.forEach((name, row) => {
    // Tracked by hand: canvas letterSpacing is not everywhere yet.
    let x = 8;
    for (const ch of name) {
      ctx.fillText(ch, x, row * ROW_HEIGHT + ROW_HEIGHT / 2);
      x += ctx.measureText(ch).width + TRACKING_PX;
    }
    widths.push(Math.min(ATLAS_WIDTH, x - TRACKING_PX + 8));
  });
  return { canvas, widths };
}

function buildGeometry(labels: Label[], rows: Map<string, number>, widths: number[], atlasHeight: number) {
  const position: number[] = [];
  const uv: number[] = [];
  const center: number[] = [];
  const offset: number[] = [];
  const dir: number[] = [];
  const index: number[] = [];
  const y = STREET_LAYER.heights.road + 0.02;
  for (const label of labels) {
    const row = rows.get(label.name)!;
    const widthPx = widths[row];
    // The row is ROW_HEIGHT tall around FONT_PX letters: scale the quad to match.
    const quadHeight = (label.height * ROW_HEIGHT) / (FONT_PX * 0.72);
    const quadLength = (quadHeight * widthPx) / ROW_HEIGHT;
    // Map frame (east, north) → group (x, −z).
    const cx = label.x;
    const cz = -label.y;
    const dx = label.dx;
    const dz = -label.dy;
    const nx = dz;
    const nz = -dx;
    const u1 = widthPx / ATLAS_WIDTH;
    const vTop = 1 - (row * ROW_HEIGHT) / atlasHeight;
    const vBottom = 1 - ((row + 1) * ROW_HEIGHT) / atlasHeight;
    const base = position.length / 3;
    const corners: [number, number, number, number][] = [
      [-quadLength / 2, -quadHeight / 2, 0, vBottom],
      [quadLength / 2, -quadHeight / 2, u1, vBottom],
      [quadLength / 2, quadHeight / 2, u1, vTop],
      [-quadLength / 2, quadHeight / 2, 0, vTop],
    ];
    for (const [a, b, u, v] of corners) {
      position.push(cx + dx * a + nx * b, y, cz + dz * a + nz * b);
      uv.push(u, v);
      center.push(cx, y, cz);
      offset.push(a, b);
      dir.push(dx, dz);
    }
    index.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  const normals = new Float32Array(position.length);
  for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
  g.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("aCenter", new THREE.Float32BufferAttribute(center, 3));
  g.setAttribute("aOffset", new THREE.Float32BufferAttribute(offset, 2));
  g.setAttribute("aDir", new THREE.Float32BufferAttribute(dir, 2));
  g.setIndex(index);
  // Labels turn around their center: pad the bounds for any orientation.
  g.computeBoundingSphere();
  g.boundingSphere!.radius += 20;
  return g;
}

function createLabelMaterial(map: THREE.Texture, fade: [number, number]) {
  const material = new THREE.MeshStandardMaterial({
    map,
    color: "#f3f1ea",
    roughness: 0.7,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFade = { value: new THREE.Vector2(...fade) };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute vec3 aCenter;
attribute vec2 aOffset;
attribute vec2 aDir;
uniform vec2 uFade;
varying float vLabelFade;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
{
  // Turn the label 180° when the camera is on its other side, so it reads upright.
  vec3 centerWorld = (modelMatrix * vec4(aCenter, 1.0)).xyz;
  vec2 dirWorld = (modelMatrix * vec4(aDir.x, 0.0, aDir.y, 0.0)).xz;
  vec2 view = centerWorld.xz - cameraPosition.xz;
  vec2 right = vec2(-view.y, view.x);
  float flip = dot(dirWorld, right) < 0.0 ? -1.0 : 1.0;
  vec2 o = aOffset * flip;
  vec2 n = vec2(aDir.y, -aDir.x);
  transformed = aCenter + vec3(aDir.x * o.x + n.x * o.y, 0.0, aDir.y * o.x + n.y * o.y);
  vLabelFade = 1.0 - smoothstep(uFade.x, uFade.y, length(centerWorld - cameraPosition));
}`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vLabelFade;")
      .replace(
        "#include <alphamap_fragment>",
        "#include <alphamap_fragment>\ndiffuseColor.a *= 0.88 * vLabelFade;",
      );
  };
  material.customProgramCacheKey = () => "street-names-v1";
  return material;
}

function smoothstep(t: number) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

export function MapStreetNames({
  blendRef,
  isMobile,
}: {
  blendRef: RefObject<MapBlend>;
  isMobile: boolean;
}) {
  const gl = useThree((s) => s.gl);
  const [built, setBuilt] = useState<{ geometry: THREE.BufferGeometry; texture: THREE.Texture } | null>(
    null,
  );
  const meshRef = useRef<THREE.Mesh>(null);
  const rotationY = (SITE.facadeBearing + 180) * DEG;
  const radius = isMobile ? 240 : 380;
  const fade: [number, number] = isMobile ? [220, 380] : [350, 600];

  useEffect(() => {
    let cancelled = false;
    let made: { geometry: THREE.BufferGeometry; texture: THREE.Texture } | null = null;
    fetch(DATA_URL)
      .then((res) => (res.ok ? (res.json() as Promise<{ ways: Way[] }>) : Promise.reject(res.status)))
      .then(async (data) => {
        const labels = placeLabels(data.ways, radius);
        const names = [...new Set(labels.map((l) => l.name))];
        const { canvas, widths } = await drawAtlas(names);
        if (cancelled) return;
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        // Read at grazing angles on the ground: as sharp as the GPU allows.
        texture.anisotropy = gl.capabilities.getMaxAnisotropy();
        const rows = new Map(names.map((n, i) => [n, i]));
        made = { geometry: buildGeometry(labels, rows, widths, canvas.height), texture };
        setBuilt(made);
      })
      .catch((error: unknown) => console.warn("[map] street names unavailable:", error));
    return () => {
      cancelled = true;
      made?.geometry.dispose();
      made?.texture.dispose();
    };
  }, [radius, gl]);

  const [fadeNear, fadeFar] = fade;
  const material = useMemo(
    () => (built ? createLabelMaterial(built.texture, [fadeNear, fadeFar]) : null),
    [built, fadeNear, fadeFar],
  );
  useEffect(() => () => material?.dispose(), [material]);

  // Fades in with the streets as the street plan takes over from the satellite photo.
  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    (mesh.material as THREE.MeshStandardMaterial).opacity = smoothstep(
      (blendRef.current.value - 0.35) / 0.5,
    );
  });

  if (!built || !material) return null;

  return (
    <group position={[SITE.addressOffset.x, 0, SITE.addressOffset.z]} rotation={[0, rotationY, 0]}>
      <mesh
        ref={meshRef}
        geometry={built.geometry}
        material={material}
        receiveShadow={!isMobile}
        // After the streets (−1), before the cloud shadows (2).
        renderOrder={0}
      />
    </group>
  );
}
