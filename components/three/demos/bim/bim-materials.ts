import * as THREE from "three";

/**
 * Presentation materials for the BIM model, close to the project's renders, plus the
 * "floor reveal" shader patch: everything above a cut height lifts and dissolves away.
 */

export const BIM_PALETTE = {
  brick: "#A85B3C",
  zinc: "#C9CED3",
  panel: "#9AA3AB",
  frame: "#F4F4F1",
  glass: "#6F8796",
  interior: "#E8E4DC",
} as const;

type BimMaterialKind = keyof typeof BIM_PALETTE;

/** Shared uniforms driving the floor reveal on every structure material. */
export type RevealUniforms = {
  uBimCut: { value: number };
  uBimLift: { value: number };
  uBimFade: { value: number };
};

export function createRevealUniforms(): RevealUniforms {
  return {
    uBimCut: { value: 1000 },
    uBimLift: { value: 0 },
    uBimFade: { value: 0 },
  };
}

/**
 * Picks a material from the object's category and its original IFC color. The GLB groups
 * merge several building parts per category, so the original color tells brick (green),
 * zinc (light grey), dark panels and glass apart.
 */
export function bimMaterialKind(category: string, originalHex: string): BimMaterialKind {
  const hex = originalHex.toLowerCase();
  // Brick walls and the mansard slopes share one color in the model: the brick material
  // turns its sloped faces into zinc (see BRICK_AND_SLOPES).
  if (hex === "00ff00") return "brick";
  if (hex === "d4d6d7") return "zinc";
  if (hex === "767676") return "panel";
  switch (category) {
    case "fachada":
      return "brick";
    case "aberturas":
      // Near-white with a cyan tint is the glazing; the other whites and browns are frames.
      return hex === "fdffff" ? "glass" : "frame";
    case "estructura":
    case "barandas":
      return "panel";
    case "revestimientos":
    case "otros":
      return hex.startsWith("f") ? "frame" : "interior";
    default:
      // losas, muros, escaleras: slabs and interior walls, seen in section.
      return "interior";
  }
}

const REVEAL_VERTEX_HEAD = /* glsl */ `
uniform float uBimCut;
uniform float uBimLift;
varying vec3 vBimWorld;
`;

// Replaces three's project_vertex chunk: lift whatever sits above the cut, in world space.
const REVEAL_PROJECT = /* glsl */ `
vec4 bimWorldPos = modelMatrix * vec4( transformed, 1.0 );
vBimWorld = bimWorldPos.xyz;
bimWorldPos.y += step( uBimCut, bimWorldPos.y ) * uBimLift;
vec4 mvPosition = viewMatrix * bimWorldPos;
gl_Position = projectionMatrix * mvPosition;
`;

const REVEAL_FRAGMENT_HEAD = /* glsl */ `
uniform float uBimCut;
uniform float uBimFade;
varying vec3 vBimWorld;
float bimHash( vec3 p ) {
  return fract( sin( dot( p, vec3( 12.9898, 78.233, 37.719 ) ) ) * 43758.5453 );
}
`;

// Dithered dissolve keeps the materials opaque (no sorting issues) while they fade.
const REVEAL_DISCARD = /* glsl */ `
if ( vBimWorld.y > uBimCut ) {
  float bimNoise = fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) );
  if ( bimNoise < uBimFade ) discard;
}
`;

// Slight per-brick tint variation (bricks of ~22 × 7.5 cm); sloped faces are the zinc mansard.
const BRICK_AND_SLOPES = /* glsl */ `
#include <color_fragment>
vec3 bimFaceNormal = normalize( cross( dFdx( vBimWorld ), dFdy( vBimWorld ) ) );
float bimUp = abs( bimFaceNormal.y );
float bimSlope = step( 0.2, bimUp ) * step( bimUp, 0.97 );
float bimBrick = bimHash( floor( vBimWorld * vec3( 4.5, 13.3, 4.5 ) ) );
diffuseColor.rgb = mix( diffuseColor.rgb * ( 0.94 + bimBrick * 0.12 ), uBimZinc, bimSlope );
`;

const SLOPE_ROUGHNESS = /* glsl */ `
#include <roughnessmap_fragment>
roughnessFactor = mix( roughnessFactor, 0.5, bimSlope );
`;

const SLOPE_METALNESS = /* glsl */ `
#include <metalnessmap_fragment>
metalnessFactor = mix( metalnessFactor, 0.3, bimSlope );
`;

function patchReveal(
  material: THREE.Material,
  uniforms: RevealUniforms,
  { brick = false }: { brick?: boolean } = {}
) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${REVEAL_VERTEX_HEAD}`)
      .replace("#include <project_vertex>", REVEAL_PROJECT);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${REVEAL_FRAGMENT_HEAD}`)
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>\n${REVEAL_DISCARD}`
      );
    if (brick) {
      shader.uniforms.uBimZinc = { value: new THREE.Color(BIM_PALETTE.zinc) };
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform vec3 uBimZinc;")
        .replace("#include <color_fragment>", BRICK_AND_SLOPES)
        .replace("#include <roughnessmap_fragment>", SLOPE_ROUGHNESS)
        .replace("#include <metalnessmap_fragment>", SLOPE_METALNESS);
    }
  };
  material.customProgramCacheKey = () => `bim-reveal${brick ? "-brick" : ""}`;
}

export function createStructureMaterial(
  kind: BimMaterialKind,
  uniforms: RevealUniforms,
  clippingPlanes: THREE.Plane[]
): THREE.MeshStandardMaterial {
  // The GLB has no normals: brick and zinc get smooth (creased) ones, the rest flat shading.
  const smooth = kind === "brick" || kind === "zinc";
  const base = { color: BIM_PALETTE[kind], clippingPlanes, flatShading: !smooth };
  let material: THREE.MeshStandardMaterial;
  switch (kind) {
    case "brick":
      material = new THREE.MeshStandardMaterial({
        ...base,
        roughness: 0.9,
        metalness: 0,
      });
      break;
    case "zinc":
      material = new THREE.MeshStandardMaterial({
        ...base,
        roughness: 0.5,
        metalness: 0.3,
      });
      break;
    case "glass":
      material = new THREE.MeshStandardMaterial({
        ...base,
        roughness: 0.1,
        metalness: 0.2,
        envMapIntensity: 2.6,
      });
      break;
    case "frame":
      material = new THREE.MeshStandardMaterial({
        ...base,
        roughness: 0.6,
        metalness: 0,
      });
      break;
    case "panel":
      material = new THREE.MeshStandardMaterial({
        ...base,
        roughness: 0.7,
        metalness: 0.1,
      });
      break;
    default:
      material = new THREE.MeshStandardMaterial({
        ...base,
        roughness: 0.92,
        metalness: 0,
      });
  }
  material.userData.kind = kind;
  patchReveal(material, uniforms, { brick: kind === "brick" });
  return material;
}

/** Shadow-pass material that lifts and dissolves exactly like the structure. */
export function createRevealDepthMaterial(
  uniforms: RevealUniforms,
  clippingPlanes: THREE.Plane[]
): THREE.MeshDepthMaterial {
  const material = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    clippingPlanes,
  });
  patchReveal(material, uniforms);
  return material;
}
