import * as THREE from "three";

/**
 * Procedural facades for the neighborhood around the tower, drawn by the GPU: no textures.
 *
 * Each building carries one `aBuilding` attribute (tint 0–1, floors, roof height, seed). Walls
 * use the extrusion's own UVs, in meters: u runs along the wall, 1 − v is the height above the
 * street. From that the shader lays out window bays per floor (glass or a lowered roller blind),
 * a shopfront with a sign band on the ground floor of mid-rises, and a lighter cornice. Far away
 * the pattern fades to its average color, so it never shimmers.
 *
 * Kept quieter than Cataluña II on purpose: soft local tints, greyed glass, no balconies.
 */

/** Typical Mar del Plata render and stone colors, one picked per building. */
const TINTS = ["#eee6d6", "#e0d9cb", "#d4d2cc", "#f2efe8", "#e6d9bf", "#dcc5b3"];

export const FACADE_FLOOR_HEIGHT = 3;

const PARS = /* glsl */ `
varying vec2 vFacadeUv;
varying vec4 vBuilding;
varying float vUp;
`;

const FRAGMENT_PARS = /* glsl */ `
${PARS}
uniform vec3 uTints[${TINTS.length}];
uniform vec3 uGlass;
uniform vec3 uBlind;
uniform vec3 uRoof;
uniform vec3 uMuteColor;
uniform float uMute;
float facadeGlass = 0.0;

float facadeHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

/** 1 between lo and hi, softened over w (anti-aliased). */
float facadeBand(float x, float lo, float hi, float w) {
  return smoothstep(lo - w, lo + w, x) - smoothstep(hi - w, hi + w, x);
}
`;

const FRAGMENT_MAIN = /* glsl */ `
#include <color_fragment>
{
  vec3 base = uTints[int(clamp(vBuilding.x, 0.0, 0.999) * ${TINTS.length.toFixed(1)})];
  float floors = vBuilding.y;
  float top = vBuilding.z;
  float seed = vBuilding.w;

  float h = 1.0 - vFacadeUv.y;
  float u = vFacadeUv.x;
  float wh = fwidth(h);

  // Mid-rises open onto the street with a taller shop floor.
  float ground = floors >= 3.0 ? 3.6 : 0.0;
  float span = mix(2.8, 3.8, fract(seed * 7.13));
  float width = mix(0.38, 0.58, fract(seed * 3.71));

  float cu = u / span;
  float fy = (h - ground) / ${FACADE_FLOOR_HEIGHT.toFixed(1)};
  vec2 cell = vec2(floor(cu), floor(fy));
  float lu = fract(cu);
  float lv = fract(fy);
  float wu = fwidth(cu);
  float wv = fwidth(fy);

  // Windows on the upper floors, none in the parapet.
  float upper = step(ground, h) * step(h, top - 0.9);
  float win = facadeBand(lu, 0.5 - width * 0.5, 0.5 + width * 0.5, wu)
    * facadeBand(lv, 0.3, 0.82, wv) * upper;
  // A light frame around each opening, a darker sill line under it.
  float frame = facadeBand(lu, 0.465 - width * 0.5, 0.535 + width * 0.5, wu)
    * facadeBand(lv, 0.27, 0.85, wv) * upper;
  float sill = facadeBand(lu, 0.45 - width * 0.5, 0.55 + width * 0.5, wu)
    * facadeBand(lv, 0.245, 0.275, wv) * upper;

  // Some windows have their roller blind partly down.
  float r = facadeHash(cell + seed * 13.0);
  float blinded = step(0.6, r) * step(mix(0.78, 0.4, fract(r * 9.1)), lv);
  vec3 glassColor = uGlass * (0.85 + 0.3 * facadeHash(cell + 3.0));
  // Recess: the lintel shades the top of the opening.
  float recess = mix(1.0, 0.62, smoothstep(0.68, 0.82, lv));

  vec3 wall = base;
  wall = mix(wall, min(base * 1.1, vec3(1.0)), frame);
  wall = mix(wall, wall * 0.72, sill);
  wall = mix(wall, mix(glassColor, uBlind, blinded) * recess, win);
  float glass = win * (1.0 - blinded);

  // Ground-floor shopfronts under a darker sign band (no branch: derivatives stay defined).
  float hasShop = step(0.5, ground);
  float su = u / 4.5;
  float shop = facadeBand(fract(su), 0.08, 0.92, fwidth(su)) * facadeBand(h, 0.35, 2.85, wh) * hasShop;
  wall = mix(wall, base * 0.78, facadeBand(h, 2.85, ground, wh) * hasShop);
  wall = mix(wall, uGlass * 1.15, shop);
  glass = max(glass, shop);

  // Lighter cornice at the top of the wall.
  wall = mix(wall, min(base * 1.06, vec3(1.0)), facadeBand(h, top - 0.55, top + 1.0, wh));

  // Far away: the average color, so the grid never shimmers.
  float far = smoothstep(0.25, 0.6, max(wu, wv));
  wall = mix(wall, mix(base, uGlass, width * 0.25), far);
  glass *= 1.0 - far;

  // Roofs: weathered concrete in the building's tint.
  float roof = step(0.5, vUp);
  diffuseColor.rgb = mix(wall, mix(base, uRoof, 0.55), roof);
  facadeGlass = glass * (1.0 - roof);
  // Muted toward a pale model white, so the project carries the color and contrast.
  diffuseColor.rgb = mix(diffuseColor.rgb, uMuteColor, uMute);
  facadeGlass *= 1.0 - uMute;
}
`;

export function createFacadeMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.88, metalness: 0 });
  const uniforms = {
    uTints: { value: TINTS.map((c) => new THREE.Color(c)) },
    uGlass: { value: new THREE.Color("#606a71") },
    uBlind: { value: new THREE.Color("#d6d0c3") },
    uRoof: { value: new THREE.Color("#9c9890") },
    uMuteColor: { value: new THREE.Color("#eceae5") },
    uMute: { value: 0.45 },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\nattribute vec4 aBuilding;\n${PARS}`)
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvFacadeUv = uv;\nvBuilding = aBuilding;\nvUp = normal.y;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAGMENT_PARS}`)
      .replace("#include <color_fragment>", FRAGMENT_MAIN)
      .replace(
        "#include <roughnessmap_fragment>",
        "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.18, facadeGlass);",
      );
  };
  material.customProgramCacheKey = () => "facade-v3";
  return material;
}

/** Per-vertex building data for one extruded footprint (constant over the building). */
export function buildingAttribute(
  count: number,
  tint: number,
  floors: number,
  top: number,
  seed: number,
): THREE.BufferAttribute {
  const data = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) data.set([tint, floors, top, seed], i * 4);
  return new THREE.BufferAttribute(data, 4);
}
