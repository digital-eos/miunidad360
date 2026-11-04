export type Vec3 = [number, number, number];

export type AABB = { min: Vec3; max: Vec3 };

export function boxFromCenterSize(position: Vec3, size: Vec3): AABB {
  return {
    min: [position[0] - size[0] / 2, position[1] - size[1] / 2, position[2] - size[2] / 2],
    max: [position[0] + size[0] / 2, position[1] + size[1] / 2, position[2] + size[2] / 2],
  };
}

/** Slab-method ray/AABB intersection test, limited to [0, maxDistance] along dir. */
export function rayIntersectsAABB(origin: Vec3, dir: Vec3, box: AABB, maxDistance: number): boolean {
  let tMin = 0;
  let tMax = maxDistance;

  for (let i = 0; i < 3; i += 1) {
    const o = origin[i];
    const d = dir[i];
    const lo = box.min[i];
    const hi = box.max[i];

    if (Math.abs(d) < 1e-9) {
      if (o < lo || o > hi) return false;
      continue;
    }

    const inv = 1 / d;
    let t1 = (lo - o) * inv;
    let t2 = (hi - o) * inv;
    if (t1 > t2) [t1, t2] = [t2, t1];

    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }

  return true;
}

export const SUN_RAY_MAX_DISTANCE = 400;
