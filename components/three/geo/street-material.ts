import * as THREE from "three";

/**
 * Street surfaces drawn by the GPU, no textures. Per vertex:
 * - aStreet: (u across the road in m, s along the segment in m, segment length, road half width)
 * - aMark: (layer, clear distance at the start, clear distance at the end, lane marking kind)
 *   The clear distances are the crossing road's half width where the segment meets an
 *   intersection (0 elsewhere): inside them the road is plain asphalt, so two streets overlapping
 *   there shade identically (no z-fighting), and the zebra crossing starts just past them.
 * Sidewalk tiles and asphalt grain use world coordinates, the same for every overlapping piece.
 */

export const STREET_LAYER = {
  sidewalk: 0,
  curb: 1,
  road: 2,
  /**
   * Height of each layer above the map (m). Spaced enough for the depth buffer to separate
   * them several hundred meters away; at that distance 5 cm steps are invisible.
   */
  heights: { sidewalk: 0.05, curb: 0.1, road: 0.15, roadJoint: 0.14 },
} as const;

const PARS = /* glsl */ `
varying vec4 vStreet;
varying vec4 vMark;
varying vec2 vStreetWorld;
`;

const FRAGMENT_PARS = /* glsl */ `
${PARS}
uniform vec3 uAsphalt;
uniform vec3 uPaving;
uniform vec3 uCurb;
uniform vec3 uPaint;
float streetPaint = 0.0;

float streetHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float streetNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(streetHash(i), streetHash(i + vec2(1.0, 0.0)), u.x),
    mix(streetHash(i + vec2(0.0, 1.0)), streetHash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float streetBand(float x, float lo, float hi, float w) {
  return smoothstep(lo - w, lo + w, x) - smoothstep(hi - w, hi + w, x);
}
`;

const FRAGMENT_MAIN = /* glsl */ `
#include <color_fragment>
{
  vec2 wp = vStreetWorld;
  float layer = vMark.x;
  float isRoad = step(1.5, layer);
  float isCurb = step(0.5, layer) * (1.0 - isRoad);
  float isWalk = 1.0 - step(0.5, layer);

  // Sidewalk: 40 cm square tiles, slightly uneven, with darker joints.
  vec2 tile = wp / 0.4;
  vec2 tw = fwidth(tile);
  vec2 edge = abs(fract(tile) - 0.5);
  float joint = max(
    smoothstep(0.5 - tw.x * 1.5, 0.5, edge.x),
    smoothstep(0.5 - tw.y * 1.5, 0.5, edge.y)
  );
  float tileFar = smoothstep(0.3, 0.7, max(tw.x, tw.y));
  vec3 walk = uPaving * (0.95 + 0.08 * streetHash(floor(tile)));
  walk = mix(walk, walk * 0.8, joint * (1.0 - tileFar));
  walk *= 0.94 + 0.08 * streetNoise(wp * 0.35);

  // Curb: light precast concrete.
  vec3 curb = uCurb * (0.96 + 0.06 * streetNoise(wp * 2.0));

  // Road: asphalt grain and patches.
  float u = vStreet.x;
  float s = vStreet.y;
  float len = vStreet.z;
  float roadHalf = vStreet.w;
  float clearStart = vMark.y;
  float clearEnd = vMark.z;
  float kind = vMark.w;
  vec3 road = uAsphalt * (0.9 + 0.12 * streetNoise(wp * 1.7) + 0.08 * streetNoise(wp * 0.11));

  // Inside an intersection: plain asphalt only.
  float open = step(clearStart, s) * step(clearEnd, len - s);
  float au = abs(u);
  float wu = fwidth(u);
  float ws = fwidth(s);
  // Darker gutter along the curb.
  road *= mix(1.0, 0.8, smoothstep(roadHalf - 0.45, roadHalf - 0.05, au) * open);

  // Zebra crossings just outside each intersection: 50 cm bars every meter.
  float gap = 1.2;
  float zebraLen = 3.0;
  float zs = step(0.01, clearStart) * step(clearStart + gap + zebraLen, len * 0.5)
    * streetBand(s, clearStart + gap, clearStart + gap + zebraLen, ws);
  float ze = step(0.01, clearEnd) * step(clearEnd + gap + zebraLen, len * 0.5)
    * streetBand(len - s, clearEnd + gap, clearEnd + gap + zebraLen, ws);
  float bars = streetBand(fract(u + 0.25), 0.0, 0.5, wu) * step(au, roadHalf - 0.35);
  float paint = max(zs, ze) * bars;

  // Lane lines: 3 m dashes, 3 m gaps.
  float dash = streetBand(fract(s / 6.0), 0.0, 0.5, ws / 6.0) * open;
  float center = streetBand(u, -0.06, 0.06, wu) * step(0.5, kind) * step(kind, 1.5);
  float lanes = streetBand(abs(au - roadHalf / 3.0), -0.06, 0.06, wu) * step(1.5, kind);
  paint = max(paint, max(center, lanes) * dash);

  // Worn paint, and no thin lines far away (they would shimmer).
  float far = smoothstep(0.08, 0.2, wu);
  paint *= (0.75 + 0.25 * streetNoise(wp * 3.0)) * (1.0 - far * (1.0 - max(zs, ze)));
  road = mix(road, uPaint, paint);

  diffuseColor.rgb = walk * isWalk + curb * isCurb + road * isRoad;
  streetPaint = paint * isRoad;
}
`;

export function createStreetMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.95,
    metalness: 0,
    // Faded in over the satellite photo during the entrance descent.
    transparent: true,
  });
  const uniforms = {
    uAsphalt: { value: new THREE.Color("#5f6164") },
    uPaving: { value: new THREE.Color("#d9d3c6") },
    uCurb: { value: new THREE.Color("#ebe7df") },
    uPaint: { value: new THREE.Color("#f4f2ec") },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>\nattribute vec4 aStreet;\nattribute vec4 aMark;\n${PARS}`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vStreet = aStreet;
vMark = aMark;
vStreetWorld = (modelMatrix * vec4(transformed, 1.0)).xz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAGMENT_PARS}`)
      .replace("#include <color_fragment>", FRAGMENT_MAIN)
      .replace(
        "#include <roughnessmap_fragment>",
        "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.7, streetPaint);",
      );
  };
  material.customProgramCacheKey = () => "streets-v2";
  return material;
}
