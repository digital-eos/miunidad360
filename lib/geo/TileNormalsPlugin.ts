import * as THREE from "three";
import type { TileNormalsRequest, TileNormalsResponse } from "./tile-normals.worker";

/**
 * 3d-tiles-renderer plugin: adds creased normals to every loaded tile mesh, computed in a
 * small worker pool. Adapted from the Takram three-geospatial storybook plugin.
 */
export class TileNormalsPlugin {
  name = "TILE_NORMALS_PLUGIN";
  // Runs before the flattening plugin (-100) so it sees the non-indexed geometry.
  priority = -1000;

  private workers: Worker[] = [];
  private next = 0;
  private nextId = 0;
  private pending = new Map<number, (normals: Float32Array) => void>();
  private creaseAngle: number;

  constructor({ creaseAngle = THREE.MathUtils.degToRad(30), workers = 2 } = {}) {
    this.creaseAngle = creaseAngle;
    for (let i = 0; i < workers; i++) {
      const worker = new Worker(new URL("./tile-normals.worker.ts", import.meta.url));
      worker.onmessage = (event: MessageEvent<TileNormalsResponse>) => {
        const resolve = this.pending.get(event.data.id);
        this.pending.delete(event.data.id);
        resolve?.(event.data.normals);
      };
      this.workers.push(worker);
    }
  }

  private compute(positions: Float32Array): Promise<Float32Array> {
    const id = this.nextId++;
    const worker = this.workers[this.next++ % this.workers.length];
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      // Copy: the tile keeps its own buffer (the flattening plugin edits it in place).
      const copy = positions.slice();
      const request: TileNormalsRequest = {
        id,
        positions: copy,
        creaseAngle: this.creaseAngle,
      };
      worker.postMessage(request, [copy.buffer]);
    });
  }

  async processTileModel(scene: THREE.Object3D) {
    const meshes: THREE.Mesh[] = [];
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      if (mesh.geometry.index) {
        const indexed = mesh.geometry;
        mesh.geometry = indexed.toNonIndexed();
        indexed.dispose();
      }
      meshes.push(mesh);
    });
    await Promise.all(
      meshes.map(async (mesh) => {
        const position = mesh.geometry.getAttribute("position");
        const array =
          position.array instanceof Float32Array
            ? position.array
            : new Float32Array(position.array as ArrayLike<number>);
        const normals = await this.compute(array);
        mesh.geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
      })
    );
  }

  dispose() {
    this.workers.forEach((w) => w.terminate());
    this.workers = [];
    this.pending.clear();
  }
}
