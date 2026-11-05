import fs from "node:fs";
import { pathToFileURL } from "node:url";
// Run from the repo root: node scripts/generate-plans.mjs
const P = pathToFileURL(process.cwd() + "/node_modules/three/").href;
const THREE = await import(P + "build/three.module.js");
const { GLTFLoader } = await import(P + "examples/jsm/loaders/GLTFLoader.js");
const { MeshoptDecoder } = await import(
  P + "examples/jsm/libs/meshopt_decoder.module.js"
);
export async function load() {
  const buf = fs.readFileSync(process.cwd() + "/public/models/schependomlaan.glb");
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await new Promise((res, rej) => loader.parse(ab, "", res, rej));
  gltf.scene.updateMatrixWorld(true);
  return { THREE, scene: gltf.scene };
}
