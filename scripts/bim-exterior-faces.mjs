import fs from "node:fs";
import { load } from "./load-glb.mjs";

/*
 * Marks which wall ("muros") triangles can be seen from outside, so the viewer can draw
 * brick on the facade and plaster inside. The IFC export puts the outer brick leaf and the
 * interior walls in the same groups with one color, so this can't come from the model.
 *
 * Rays are shot from all around the building (and from above, like the viewer's aerial
 * camera) toward random points of its bounding box; every wall triangle that a ray hits
 * first is visible from outside.
 *
 * Run from the repo root after changing the model: node scripts/bim-exterior-faces.mjs
 * Output: lib/bim/exterior-faces.json, { meshName: base64 bitset, one bit per triangle
 * in index order }.
 */

const RAYS = 600_000;
const RADIUS = 45;
const MIN_ELEVATION = (-5 * Math.PI) / 180;
const MAX_ELEVATION = (75 * Math.PI) / 180;
const COPLANAR = 0.03;

const { THREE, scene } = await load();
const { MeshBVH } = await import("three-mesh-bvh");

const meshes = [];
scene.traverse((o) => {
  if (o.isMesh && !o.name.startsWith("APT-")) meshes.push(o);
});

// One unindexed world-space soup of every structure triangle, remembering where each
// triangle came from.
const v = new THREE.Vector3();
const chunks = [];
const ownerMesh = [];
const ownerTriangle = [];
let total = 0;
for (const [meshIndex, mesh] of meshes.entries()) {
  const pos = mesh.geometry.attributes.position;
  const index = mesh.geometry.index;
  const count = index ? index.count : pos.count;
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    v.fromBufferAttribute(pos, index ? index.getX(i) : i).applyMatrix4(mesh.matrixWorld);
    out[i * 3] = v.x;
    out[i * 3 + 1] = v.y;
    out[i * 3 + 2] = v.z;
  }
  for (let t = 0; t < count / 3; t++) {
    ownerMesh.push(meshIndex);
    ownerTriangle.push(t);
  }
  chunks.push(out);
  total += out.length;
}
const soup = new Float32Array(total);
let offset = 0;
for (const chunk of chunks) {
  soup.set(chunk, offset);
  offset += chunk.length;
}
const soupGeometry = new THREE.BufferGeometry();
soupGeometry.setAttribute("position", new THREE.BufferAttribute(soup, 3));
const bvh = new MeshBVH(soupGeometry);

const bounds = new THREE.Box3();
for (const mesh of meshes) bounds.expandByObject(mesh);
const center = bounds.getCenter(new THREE.Vector3());
const size = bounds.getSize(new THREE.Vector3());

// Deterministic random numbers, so the output only changes when the model does.
let seed = 1;
const random = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const seen = new Set();
const ray = new THREE.Ray();
const target = new THREE.Vector3();
for (let i = 0; i < RAYS; i++) {
  const azimuth = random() * Math.PI * 2;
  const elevation = MIN_ELEVATION + random() * (MAX_ELEVATION - MIN_ELEVATION);
  ray.origin.set(
    center.x + Math.cos(elevation) * Math.cos(azimuth) * RADIUS,
    Math.max(0.5, center.y + Math.sin(elevation) * RADIUS),
    center.z + Math.cos(elevation) * Math.sin(azimuth) * RADIUS
  );
  target.set(
    bounds.min.x + random() * size.x,
    bounds.min.y + random() * size.y,
    bounds.min.z + random() * size.z
  );
  ray.direction.subVectors(target, ray.origin).normalize();
  const hits = bvh.raycast(ray, THREE.DoubleSide);
  if (hits.length === 0) continue;
  // The export has coplanar duplicates (wall layers sharing a face): take every surface
  // within a few centimeters of the first hit, since any of them may be the one drawn.
  const first = Math.min(...hits.map((h) => h.distance));
  for (const h of hits) {
    if (h.distance <= first + COPLANAR) seen.add(Math.floor(h.face.a / 3));
  }
}

const result = {};
let exteriorCount = 0;
let triangleCount = 0;
const bitsByMesh = new Map();
for (const [meshIndex, mesh] of meshes.entries()) {
  if (!mesh.name.includes("_muros")) continue;
  const count = (mesh.geometry.index ? mesh.geometry.index.count : mesh.geometry.attributes.position.count) / 3;
  bitsByMesh.set(meshIndex, new Uint8Array(Math.ceil(count / 8)));
  triangleCount += count;
}
for (const soupTriangle of seen) {
  const bits = bitsByMesh.get(ownerMesh[soupTriangle]);
  if (!bits) continue;
  const t = ownerTriangle[soupTriangle];
  bits[t >> 3] |= 1 << (t & 7);
  exteriorCount++;
}
for (const [meshIndex, bits] of bitsByMesh) {
  result[meshes[meshIndex].name] = Buffer.from(bits).toString("base64");
}

const outPath = process.cwd() + "/lib/bim/exterior-faces.json";
fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n");
console.log(
  `${exteriorCount} of ${triangleCount} wall triangles seen from outside → lib/bim/exterior-faces.json`
);
