import * as THREE from "three";

/**
 * Material for the neighboring buildings: a window grid drawn in world space (3 m floors,
 * 1.8 m bays, a darker shopfront band at street level), with glossy glass and matte walls.
 * No textures to load; the grid fades to its average color when it gets smaller than a
 * couple of pixels, so the far view stays clean.
 */

const VERTEX_HEAD = /* glsl */ `
varying vec3 vCityWorld;
`;

const VERTEX_WORLD = /* glsl */ `
#include <begin_vertex>
{
  vec4 cityPos = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
  cityPos = instanceMatrix * cityPos;
  #endif
  vCityWorld = ( modelMatrix * cityPos ).xyz;
}
`;

const FRAGMENT_HEAD = /* glsl */ `
varying vec3 vCityWorld;
float cityHash( vec2 p ) {
  return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 );
}
float cityBox( float x, float halfW ) {
  float d = abs( fract( x ) - 0.5 );
  float fw = fwidth( x );
  return 1.0 - smoothstep( halfW - fw, halfW + fw, d );
}
`;

const FRAGMENT_COLOR = /* glsl */ `
#include <color_fragment>
vec3 cityN = normalize( cross( dFdx( vCityWorld ), dFdy( vCityWorld ) ) );
float cityWall = 1.0 - step( 0.5, abs( cityN.y ) );
float cityU = abs( cityN.x ) > abs( cityN.z ) ? vCityWorld.z : vCityWorld.x;
float cityRowF = vCityWorld.y / 3.0;
float cityColF = cityU / 1.8;
float cityDetail = 1.0 - smoothstep( 0.25, 0.6, max( fwidth( cityRowF ), fwidth( cityColF ) ) );
float cityStreet = 1.0 - step( 3.4, vCityWorld.y );
// Window: 1.1 m wide, 1.6 m tall, sill at 0.9 m.
float cityWin = cityBox( cityColF, 0.3 ) * cityBox( cityRowF - 0.05, 0.27 );
cityWin = mix( cityWin, cityBox( cityColF, 0.44 ) * step( 0.25, vCityWorld.y ), cityStreet );
cityWin *= cityWall;
float cityCell = cityHash( vec2( floor( cityColF ), floor( cityRowF ) ) + cityN.xz * 17.0 );
vec3 cityGlass = vec3( 0.13, 0.17, 0.2 ) * ( 0.75 + cityCell * 0.7 );
cityGlass = mix( cityGlass, vec3( 0.42, 0.36, 0.3 ), step( 0.9, cityCell ) * 0.5 );
// Floor lines on the walls
float cityBand = cityBox( cityRowF + 0.5, 0.03 ) * cityWall * ( 1.0 - cityStreet );
vec3 cityWallColor = diffuseColor.rgb * ( 1.0 - cityBand * 0.12 );
vec3 cityFar = mix( cityWallColor, vec3( 0.16, 0.19, 0.22 ), 0.3 * cityWall );
vec3 cityNear = mix( cityWallColor, cityGlass, cityWin );
diffuseColor.rgb = mix( cityFar, cityNear, cityDetail );
// Roofs a touch darker
diffuseColor.rgb *= 1.0 - 0.12 * ( 1.0 - cityWall );
float cityGloss = cityWin * cityDetail;
`;

const FRAGMENT_ROUGHNESS = /* glsl */ `
#include <roughnessmap_fragment>
roughnessFactor = mix( roughnessFactor, 0.12, cityGloss );
`;

export function createCityMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.92 });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERTEX_HEAD}`)
      .replace("#include <begin_vertex>", VERTEX_WORLD);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAGMENT_HEAD}`)
      .replace("#include <color_fragment>", FRAGMENT_COLOR)
      .replace("#include <roughnessmap_fragment>", FRAGMENT_ROUGHNESS);
  };
  material.customProgramCacheKey = () => "edificio-city";
  return material;
}
