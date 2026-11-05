import fs from "node:fs";
// Generates public/projects/schependomlaan/plano-*.svg by slicing the BIM model at each floor.
// Usage (from the repo root): node scripts/generate-plans.mjs
import { load } from "./load-glb.mjs";
const ROOT = process.cwd() + "/";
const data = JSON.parse(fs.readFileSync(ROOT + "data/schependomlaan.json", "utf8"));
const { THREE, scene } = await load();

const FLOORS = [
  { id: "0-planta-baja", label: "Planta baja", floor: 0, cut: 2.8 },
  { id: "1-1er-piso", label: "1.er piso", floor: 1, cut: 5.8 },
  { id: "2-2do-piso", label: "2.º piso", floor: 2, cut: 8.8 },
  { id: "3-3er-piso", label: "3.er piso", floor: 3, cut: 11.8 },
];
const kindOf = (name) => {
  if (name.startsWith("APT-")) return "apt";
  const cat = name.split("_").slice(2).join("_");
  if (cat === "aberturas") return "glass";
  if (cat === "escaleras" || cat === "barandas") return "thin";
  if (cat === "losas" || cat === "otros") return "faint";
  return "wall";
};

// World-space triangles per mesh, computed once.
const meshes = [];
scene.traverse((o) => {
  if (!o.isMesh) return;
  const g = o.geometry,
    pos = g.attributes.position,
    idx = g.index;
  const v = new THREE.Vector3();
  const pts = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
    pts.set([v.x, v.y, v.z], i * 3);
  }
  const tri = idx ? Array.from(idx.array) : [...Array(pos.count).keys()];
  meshes.push({ name: o.name, kind: kindOf(o.name), pts, tri });
});

function slice(m, h) {
  const segs = [];
  const { pts, tri } = m;
  for (let t = 0; t < tri.length; t += 3) {
    const P = [0, 1, 2].map((k) => [
      pts[tri[t + k] * 3],
      pts[tri[t + k] * 3 + 1] - h,
      pts[tri[t + k] * 3 + 2],
    ]);
    const hits = [];
    for (let e = 0; e < 3; e++) {
      const a = P[e],
        b = P[(e + 1) % 3];
      if (a[1] > 0 !== b[1] > 0) {
        const s = a[1] / (a[1] - b[1]);
        hits.push([a[0] + s * (b[0] - a[0]), a[2] + s * (b[2] - a[2])]);
      }
    }
    if (hits.length === 2) segs.push(hits);
  }
  return segs;
}

// Fit the cut walls of every floor into the sheet, same scale and origin for every floor.
const box = { min: { x: Infinity, z: Infinity }, max: { x: -Infinity, z: -Infinity } };
for (const f of FLOORS)
  for (const m of meshes)
    if (m.kind === "wall")
      for (const seg of slice(m, f.cut))
        for (const [x, z] of seg) {
          box.min.x = Math.min(box.min.x, x);
          box.max.x = Math.max(box.max.x, x);
          box.min.z = Math.min(box.min.z, z);
          box.max.z = Math.max(box.max.z, z);
        }
const S = 1000,
  M = 60,
  TB = 120;
const w = box.max.x - box.min.x,
  d = box.max.z - box.min.z;
const k = Math.min((S - 2 * M) / w, (S - 2 * M - TB) / d);
const ox = (S - w * k) / 2,
  oy = M + (S - 2 * M - TB - d * k) / 2;
const X = (x) => +(ox + (x - box.min.x) * k).toFixed(1);
const Y = (z) => +(oy + (z - box.min.z) * k).toFixed(1);
const path = (segs) =>
  segs.map(([a, b]) => `M${X(a[0])} ${Y(a[1])}L${X(b[0])} ${Y(b[1])}`).join("");

const STYLE = {
  faint: 'stroke="#c9c3b6" stroke-width="0.8"',
  wall: 'stroke="#1c1c1c" stroke-width="2"',
  thin: 'stroke="#6e6a62" stroke-width="0.8"',
  glass: 'stroke="#5b8fb0" stroke-width="1.1"',
  apt: 'stroke="#d99a3e" stroke-width="0.9" stroke-dasharray="4 3"',
};

for (const f of FLOORS) {
  const layers = { faint: [], apt: [], thin: [], glass: [], wall: [] };
  for (const m of meshes) layers[m.kind].push(...slice(m, f.cut));
  // Faint layer: the slab edge just above floor level, as a footprint reference.
  for (const m of meshes)
    if (m.kind === "wall") layers.faint.push(...slice(m, f.cut - 1.1));
  const apts = data.apartments.filter((a) => a.floor === f.floor);
  const labels = apts
    .map(
      (a) =>
        `<g transform="translate(${X(a.centre[0])} ${Y(a.centre[2])})"><circle r="24" fill="#fff" stroke="#d99a3e" stroke-width="1.5"/><text y="7" text-anchor="middle" font-size="20" fill="#9c5f08">${a.number}</text></g>`
    )
    .join("");
  const scaleM = 5,
    sx = 60,
    sy = S - 70;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" font-family="'IBM Plex Mono', ui-monospace, monospace">
<rect width="${S}" height="${S}" fill="#ffffff"/>
<g fill="none" stroke-linecap="round">
${Object.entries(layers)
  .map(([kind, segs]) => (segs.length ? `<path ${STYLE[kind]} d="${path(segs)}"/>` : ""))
  .join("\n")}
</g>
${labels}
<g fill="#1c1c1c" font-size="18">
<line x1="${sx}" y1="${sy}" x2="${sx + scaleM * k}" y2="${sy}" stroke="#1c1c1c" stroke-width="2"/>
<line x1="${sx}" y1="${sy - 6}" x2="${sx}" y2="${sy + 6}" stroke="#1c1c1c" stroke-width="1.5"/>
<line x1="${sx + scaleM * k}" y1="${sy - 6}" x2="${sx + scaleM * k}" y2="${sy + 6}" stroke="#1c1c1c" stroke-width="1.5"/>
<text x="${sx}" y="${sy + 26}" fill="#6e6a62">0</text><text x="${sx + scaleM * k}" y="${sy + 26}" text-anchor="middle" fill="#6e6a62">${scaleM} m</text>
<text x="${S - 60}" y="${S - 88}" text-anchor="end" font-size="36" font-family="Georgia, serif">${f.label}</text>
<text x="${S - 60}" y="${S - 56}" text-anchor="end" fill="#6e6a62">SCHEPENDOMLAAN · CORTE A +${(f.cut - (1.61 + f.floor * 3)).toFixed(1)} M</text>
</g>
</svg>
`;
  const out = `${ROOT}public/projects/schependomlaan/plano-${f.id}.svg`;
  fs.writeFileSync(out, svg);
  console.log(
    f.id,
    Object.fromEntries(Object.entries(layers).map(([a, b]) => [a, b.length])),
    (svg.length / 1024).toFixed(0) + "KB"
  );
}
