import * as THREE from "three";

/**
 * Presentation materials for the BIM model, close to the project's renders, plus the
 * "floor reveal" shader patch: everything above a cut height lifts and dissolves away.
 */

export const BIM_PALETTE = {
  brick: "#A85B3C",
  /** Surfaces that share the green "covering" color in the export: finishes, copings, roofs. */
  cladding: "#E8E4DC",
  /** Walls: brick on the faces that look outside, plaster on the others. */
  wall: "#E8E4DC",
  zinc: "#C9CED3",
  panel: "#9AA3AB",
  frame: "#F4F4F1",
  glass: "#6F8796",
  interior: "#E8E4DC",
} as const;

type BimMaterialKind = keyof typeof BIM_PALETTE;

/** Flat roofs and copings: light grey bitumen and stone, as in the project's renders. */
const ROOF = "#CDD1D2";

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
 * merge several building parts per category, so the original color tells the parts apart.
 */
export function bimMaterialKind(category: string, originalHex: string): BimMaterialKind {
  const hex = originalHex.toLowerCase();
  // Green is the export's generic covering color: copings, flat roofs, the mansard slopes
  // and interior finishes. The real brick is the outer leaf of the walls ("muros").
  if (hex === "00ff00") return category === "fachada" ? "brick" : "cladding";
  if (hex === "d4d6d7") return "zinc";
  if (hex === "767676") return "panel";
  switch (category) {
    case "fachada":
      return "brick";
    case "muros":
      return "wall";
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
      // losas, escaleras: slabs and stairs, seen in section.
      return "interior";
  }
}

/**
 * Wall meshes carry a per-vertex `bimExterior` attribute (1 on faces that look outside),
 * precomputed by scripts/bim-exterior-faces.mjs: the brick leaf and the interior walls
 * share one group and one color in the export.
 */
export const EXTERIOR_ATTRIBUTE = "bimExterior";

const REVEAL_VERTEX_HEAD = /* glsl */ `
uniform float uBimCut;
uniform float uBimLift;
varying vec3 vBimWorld;
#ifdef BIM_EXTERIOR
attribute float bimExterior;
varying float vBimExterior;
#endif
`;

// Replaces three's project_vertex chunk: lift whatever sits above the cut, in world space.
const REVEAL_PROJECT = /* glsl */ `
vec4 bimWorldPos = modelMatrix * vec4( transformed, 1.0 );
vBimWorld = bimWorldPos.xyz;
#ifdef BIM_EXTERIOR
vBimExterior = bimExterior;
#endif
bimWorldPos.y += step( uBimCut, bimWorldPos.y ) * uBimLift;
vec4 mvPosition = viewMatrix * bimWorldPos;
gl_Position = projectionMatrix * mvPosition;
`;

const REVEAL_FRAGMENT_HEAD = /* glsl */ `
uniform float uBimCut;
uniform float uBimFade;
varying vec3 vBimWorld;
#ifdef BIM_EXTERIOR
varying float vBimExterior;
#endif
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

/*
 * Procedural surfaces, computed in world space: the IFC export has no UVs, so image
 * textures would need a mapping step; this needs no assets and costs nothing to load.
 * Every pattern fades to its average color once it gets smaller than a couple of pixels,
 * so the far view stays clean (no shimmering) and the detail shows when zooming in.
 */
const SURFACE_HEAD = /* glsl */ `
uniform vec3 uBimZinc;
uniform vec3 uBimBrick;
uniform vec3 uBimRoof;
float bimHash2( vec2 p ) {
  return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 );
}
float bimValueNoise( vec2 p ) {
  vec2 i = floor( p );
  vec2 f = fract( p );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix(
    mix( bimHash2( i ), bimHash2( i + vec2( 1.0, 0.0 ) ), f.x ),
    mix( bimHash2( i + vec2( 0.0, 1.0 ) ), bimHash2( i + vec2( 1.0, 1.0 ) ), f.x ),
    f.y
  );
}
// Anti-aliased mask of lines of half-width w (in pattern units) around whole values of x.
float bimLines( float x, float w ) {
  float d = abs( fract( x + 0.5 ) - 0.5 );
  float fw = fwidth( x );
  return 1.0 - smoothstep( w - fw, w + fw, d );
}
// 1 while one pattern unit spans several pixels, 0 once it shrinks under ~2 pixels.
float bimDetail( float fw ) {
  return 1.0 - smoothstep( 0.3, 0.7, fw );
}
`;

// Shared start: true face normal and a horizontal coordinate along the face.
const SURFACE_FRAME = /* glsl */ `
vec3 bimN = normalize( cross( dFdx( vBimWorld ), dFdy( vBimWorld ) ) );
float bimUp = abs( bimN.y );
float bimSlope = step( 0.2, bimUp ) * step( bimUp, 0.97 );
float bimFlat = step( 0.97, bimUp );
float bimU = abs( bimN.x ) > abs( bimN.z ) ? vBimWorld.z : vBimWorld.x;
float bimHeight = 0.0;
// Broad weathering, a few meters across, so large faces are never one flat color.
float bimWear = bimValueNoise( vec2( bimU, vBimWorld.y ) * 0.35 + bimN.xz * 7.0 );
`;

// Standing-seam zinc: vertical seams every 45 cm along the slope, faint panel-to-panel tint.
const ZINC_SEAMS = /* glsl */ `
vec3 bimT = normalize( vec3( -bimN.z, 0.0, bimN.x ) + 1e-5 );
float bimSeamF = dot( vBimWorld, bimT ) / 0.45;
float bimSeamDetail = bimDetail( fwidth( bimSeamF ) );
float bimSeam = bimLines( bimSeamF, 0.035 ) * bimSeamDetail;
float bimPanel = bimHash2( vec2( floor( bimSeamF ), 3.7 ) );
vec3 bimZincColor = uBimZinc * ( 0.94 + bimPanel * 0.08 * bimSeamDetail ) * ( 0.95 + 0.1 * bimWear );
bimZincColor *= 1.0 - bimSeam * 0.18;
`;

/*
 * Masonry: brick in running bond (21 × 5 cm bricks, 1 cm joints) on vertical faces, by a
 * weight set per material (BIM_BRICK). Materials with BIM_ROOFING also turn their slopes
 * into standing-seam zinc and their flat faces into light roofing.
 */
const MASONRY = /* glsl */ `
#include <color_fragment>
${SURFACE_FRAME}
float bimRowF = vBimWorld.y / 0.0625;
float bimRow = floor( bimRowF );
float bimColF = bimU / 0.22 + 0.5 * mod( bimRow, 2.0 );
float bimBrickDetail = bimDetail( max( fwidth( bimRowF ), fwidth( bimColF ) ) );
float bimBrickW = ( 1.0 - step( 0.2, bimUp ) ) * BIM_BRICK;
float bimMortar = max( bimLines( bimRowF, 0.08 ), bimLines( bimColF, 0.023 ) ) * bimBrickDetail * bimBrickW;
float bimTint = bimHash2( vec2( floor( bimColF ), bimRow ) );
vec3 bimBrick = uBimBrick * mix( 1.0, 0.84 + bimTint * 0.32, bimBrickDetail );
bimBrick *= 0.92 + 0.16 * bimWear;
bimBrick = mix( bimBrick, vec3( 0.52, 0.49, 0.45 ), bimMortar * 0.8 );
vec3 bimColor = mix( diffuseColor.rgb * ( 0.95 + 0.1 * bimWear ), bimBrick, bimBrickW );
bimHeight = -bimMortar;
#ifdef BIM_ROOFING
${ZINC_SEAMS}
bimColor = mix( bimColor, bimZincColor, bimSlope );
bimColor = mix( bimColor, uBimRoof * ( 0.93 + 0.14 * bimWear ), bimFlat );
bimHeight += bimSeam * bimSlope;
#else
bimSlope = 0.0;
#endif
diffuseColor.rgb = bimColor;
`;

// Zinc parts on their own: seams on the slopes, plain weathered metal elsewhere.
const ZINC = /* glsl */ `
#include <color_fragment>
${SURFACE_FRAME}
${ZINC_SEAMS}
diffuseColor.rgb = mix( diffuseColor.rgb * ( 0.95 + 0.1 * bimWear ), bimZincColor, bimSlope );
bimHeight = bimSeam * bimSlope;
`;

// Painted panels, slabs and interior faces: only the soft weathering.
const GRAIN = /* glsl */ `
#include <color_fragment>
${SURFACE_FRAME}
diffuseColor.rgb *= 0.95 + 0.1 * bimWear;
`;

// Glass: each pane gets its own darkness (curtains, rooms behind), like a real facade.
const GLASS = /* glsl */ `
#include <color_fragment>
float bimPane = bimHash( floor( vBimWorld * vec3( 0.9, 0.7, 0.9 ) ) );
diffuseColor.rgb *= 0.6 + bimPane * 0.9;
diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.55, 0.42, 0.3 ), step( 0.85, bimPane ) * 0.35 );
`;

const SLOPE_ROUGHNESS = /* glsl */ `
#include <roughnessmap_fragment>
roughnessFactor = mix( roughnessFactor, 0.45 + 0.1 * bimWear, bimSlope );
`;

const SLOPE_METALNESS = /* glsl */ `
#include <metalnessmap_fragment>
metalnessFactor = mix( metalnessFactor, 0.35, bimSlope );
`;

// Bump from bimHeight (meters) through screen-space derivatives, as three's bump map does.
const SURFACE_BUMP = /* glsl */ `
#include <normal_fragment_maps>
{
  float bimHx = dFdx( bimHeight ) * 0.004;
  float bimHy = dFdy( bimHeight ) * 0.004;
  vec3 bimSx = dFdx( -vViewPosition );
  vec3 bimSy = dFdy( -vViewPosition );
  vec3 bimR1 = cross( bimSy, normal );
  vec3 bimR2 = cross( normal, bimSx );
  float bimDet = dot( bimSx, bimR1 ) * faceDirection;
  vec3 bimGrad = sign( bimDet ) * ( bimHx * bimR1 + bimHy * bimR2 );
  normal = normalize( abs( bimDet ) * normal - bimGrad );
}
`;

type Surface = "masonry" | "zinc" | "grain" | "glass";

const SURFACE_BY_KIND: Record<BimMaterialKind, Surface> = {
  brick: "masonry",
  cladding: "masonry",
  wall: "masonry",
  zinc: "zinc",
  glass: "glass",
  frame: "grain",
  panel: "grain",
  interior: "grain",
};

/** GLSL defines per kind: how much brick its vertical faces get, and roof treatment. */
function surfaceDefines(kind: BimMaterialKind): Record<string, string> {
  switch (kind) {
    case "brick":
      return { BIM_BRICK: "1.0", BIM_ROOFING: "" };
    case "cladding":
      return { BIM_BRICK: "0.0", BIM_ROOFING: "" };
    case "wall":
      return { BIM_BRICK: "vBimExterior", BIM_EXTERIOR: "" };
    default:
      return {};
  }
}

function patchReveal(material: THREE.Material, uniforms: RevealUniforms, kind?: BimMaterialKind) {
  const surface = kind ? SURFACE_BY_KIND[kind] : undefined;
  if (kind) material.defines = { ...material.defines, ...surfaceDefines(kind) };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${REVEAL_VERTEX_HEAD}`)
      .replace("#include <project_vertex>", REVEAL_PROJECT);
    let fragment = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${REVEAL_FRAGMENT_HEAD}`)
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>\n${REVEAL_DISCARD}`
      );
    if (surface) {
      shader.uniforms.uBimZinc = { value: new THREE.Color(BIM_PALETTE.zinc) };
      shader.uniforms.uBimBrick = { value: new THREE.Color(BIM_PALETTE.brick) };
      shader.uniforms.uBimRoof = { value: new THREE.Color(ROOF) };
      fragment = fragment.replace("#include <common>", `#include <common>\n${SURFACE_HEAD}`);
    }
    if (surface === "glass") {
      fragment = fragment.replace("#include <color_fragment>", GLASS);
    } else if (surface) {
      const color = surface === "masonry" ? MASONRY : surface === "zinc" ? ZINC : GRAIN;
      fragment = fragment
        .replace("#include <color_fragment>", color)
        .replace("#include <normal_fragment_maps>", SURFACE_BUMP);
      if (surface !== "grain") {
        fragment = fragment
          .replace("#include <roughnessmap_fragment>", SLOPE_ROUGHNESS)
          .replace("#include <metalnessmap_fragment>", SLOPE_METALNESS);
      }
    }
    shader.fragmentShader = fragment;
  };
  material.customProgramCacheKey = () => `bim-reveal-${kind ?? "plain"}`;
}

export function createStructureMaterial(
  kind: BimMaterialKind,
  uniforms: RevealUniforms,
  clippingPlanes: THREE.Plane[]
): THREE.MeshStandardMaterial {
  // The GLB has no normals: the roofed masonry and zinc get smooth (creased) ones, the
  // rest flat shading.
  const smooth = kind === "brick" || kind === "cladding" || kind === "zinc";
  const base = { color: BIM_PALETTE[kind], clippingPlanes, flatShading: !smooth };
  let material: THREE.MeshStandardMaterial;
  switch (kind) {
    case "brick":
    case "cladding":
      material = new THREE.MeshStandardMaterial({
        ...base,
        roughness: 0.9,
        metalness: 0,
      });
      break;
    case "wall":
      material = new THREE.MeshStandardMaterial({
        ...base,
        // The export winds the outer brick leaf inward: one-sided, it would vanish from
        // outside and show the inner leaf behind the cavity. Flat shading takes its normal
        // from screen derivatives, so lighting stays right on either side.
        side: THREE.DoubleSide,
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
      // Dark, smooth and non-metallic: the Fresnel reflections of the sky carry the look,
      // strong at grazing angles and see-through-dark when facing the camera.
      material = new THREE.MeshPhysicalMaterial({
        ...base,
        color: "#2b3a44",
        roughness: 0.04,
        metalness: 0,
        ior: 1.5,
        specularIntensity: 1,
        envMapIntensity: 1.8,
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
  patchReveal(material, uniforms, kind);
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
