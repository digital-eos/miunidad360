import * as THREE from "three";

/**
 * Procedural surface detail for the tower's materials, drawn by the GPU from the world
 * position: no textures, no UVs needed, the geometry untouched.
 * - Render (enduit): faint blotches in the color and a fine relief that catches grazing sun.
 * - Glass: each pane a little different in tint and gloss, and a slight waviness that bends
 *   the reflections, as real float glass does.
 * Fine detail fades with distance (from the pixel footprint) so it never shimmers.
 */

const NOISE = /* glsl */ `
varying vec3 vSurfaceWorld;

float surfaceHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float surfaceNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(surfaceHash(i), surfaceHash(i + vec3(1, 0, 0)), f.x),
        mix(surfaceHash(i + vec3(0, 1, 0)), surfaceHash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(surfaceHash(i + vec3(0, 0, 1)), surfaceHash(i + vec3(1, 0, 1)), f.x),
        mix(surfaceHash(i + vec3(0, 1, 1)), surfaceHash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z
  );
}

// Bump from a height's screen derivatives (same method as three's bump map).
vec3 surfacePerturb(vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDir) {
  vec3 sigmaX = normalize(dFdx(surfPos));
  vec3 sigmaY = normalize(dFdy(surfPos));
  vec3 r1 = cross(sigmaY, surfNorm);
  vec3 r2 = cross(surfNorm, sigmaX);
  float det = dot(sigmaX, r1) * faceDir;
  vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
  return normalize(abs(det) * surfNorm - grad);
}
`;

function injectCommon(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vSurfaceWorld;")
    .replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvSurfaceWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;",
    );
  shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>\n${NOISE}`);
}

/** Lightly textured render on a wall material (color blotches + fine relief). */
export function addRenderTexture(material: THREE.MeshStandardMaterial, { bump = 0.025 } = {}) {
  material.onBeforeCompile = (shader) => {
    injectCommon(shader);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
{
  vec3 p = vSurfaceWorld;
  // Large, faint patches (trowel and weathering), then the grain's own tint.
  float patches = surfaceNoise(p * 0.7) * 0.6 + surfaceNoise(p * 2.3) * 0.4;
  diffuseColor.rgb *= 0.94 + 0.1 * patches;
}`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
{
  vec3 p = vSurfaceWorld;
  float grain = surfaceNoise(p * 14.0) * 0.6 + surfaceNoise(p * 41.0) * 0.4;
  // Fade the relief once a grain is smaller than about a pixel.
  float detail = 1.0 - smoothstep(0.35, 0.9, length(fwidth(p)) * 41.0);
  vec2 dH = vec2(dFdx(grain), dFdy(grain)) * ${bump.toFixed(4)} * detail;
  normal = surfacePerturb(-vViewPosition, normal, dH, faceDirection);
}`,
      );
  };
  material.customProgramCacheKey = () => `render-texture-${bump}`;
  return material;
}

/** Pane-to-pane variation and float-glass waviness on a glass material. */
export function addGlassVariation(material: THREE.MeshPhysicalMaterial) {
  material.onBeforeCompile = (shader) => {
    injectCommon(shader);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
float glassVariation = surfaceNoise(vSurfaceWorld * 0.55 + 7.0);
diffuseColor.rgb *= 0.8 + 0.4 * glassVariation;`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
roughnessFactor = mix(0.015, 0.07, surfaceNoise(vSurfaceWorld * 0.9 + 3.0));`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
{
  // Slow waves, a few centimeters across a pane: reflections bend, panes don't match.
  float wave = surfaceNoise(vSurfaceWorld * 1.3) * 0.7 + surfaceNoise(vSurfaceWorld * 3.1) * 0.3;
  vec2 dH = vec2(dFdx(wave), dFdy(wave)) * 0.06;
  normal = surfacePerturb(-vViewPosition, normal, dH, faceDirection);
}`,
      );
  };
  material.customProgramCacheKey = () => "glass-variation";
  return material;
}
