import * as THREE from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Google's photorealistic tiles have no normals, but the atmosphere's post-process sunlight
 * needs them. This worker computes creased normals (smooth below the crease angle, hard
 * edges above) for a non-indexed position buffer, off the main thread.
 */
export type TileNormalsRequest = {
  id: number;
  positions: Float32Array;
  creaseAngle: number;
};
export type TileNormalsResponse = { id: number; normals: Float32Array };

const ctx = self as unknown as Worker;

ctx.onmessage = (event: MessageEvent<TileNormalsRequest>) => {
  const { id, positions, creaseAngle } = event.data;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const creased = toCreasedNormals(geometry, creaseAngle);
  const normals = creased.getAttribute("normal").array as Float32Array;
  const response: TileNormalsResponse = { id, normals };
  ctx.postMessage(response, [normals.buffer]);
};
