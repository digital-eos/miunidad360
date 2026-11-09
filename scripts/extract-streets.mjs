// Extracts the street network around Cataluña II from OpenStreetMap (Overpass API) once, into
// public/geo/streets/cataluna-ii.json, in the same local frame as public/geo/buildings/:
// meters east / north of the site's address point.
//
//   node scripts/extract-streets.mjs
//
// Data © OpenStreetMap contributors, ODbL.

import fs from "node:fs";
import path from "node:path";

const SITE = { lat: -38.010459, lon: -57.548978 };
const RADIUS_M = 700;
const OUT = path.join("public", "geo", "streets", "cataluna-ii.json");

const KINDS = "primary|secondary|tertiary|residential|unclassified|living_street|pedestrian";
const query = `[out:json][timeout:60];
way["highway"~"^(${KINDS})$"](around:${RADIUS_M},${SITE.lat},${SITE.lon});
out tags geom;`;

// The main instance is often busy: fall back to public mirrors.
const SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
let data = null;
for (const url of SERVERS) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "miunidad360-extract" },
    body: "data=" + encodeURIComponent(query),
  }).catch((error) => ({ ok: false, status: String(error) }));
  if (res.ok) {
    data = await res.json();
    break;
  }
  console.warn(`${url}: ${res.status}`);
}
if (!data) throw new Error("no Overpass server answered");

// Local tangent plane: meters per degree at the site's latitude.
const phi = (SITE.lat * Math.PI) / 180;
const mLat = 111132.954 - 559.822 * Math.cos(2 * phi) + 1.175 * Math.cos(4 * phi);
const mLon = 111412.84 * Math.cos(phi) - 93.5 * Math.cos(3 * phi);
const round = (v) => Math.round(v * 10) / 10;

const ways = data.elements
  .filter((el) => el.type === "way" && el.geometry?.length > 1)
  .map((el) => ({
    id: el.id,
    k: el.tags.highway,
    n: el.tags.name ?? null,
    o: el.tags.oneway === "yes" ? 1 : 0,
    w: el.tags.width ? Number.parseFloat(el.tags.width) || null : null,
    l: el.tags.lanes ? Number.parseInt(el.tags.lanes, 10) || null : null,
    p: el.geometry.map((g) => [round((g.lon - SITE.lon) * mLon), round((g.lat - SITE.lat) * mLat)]),
  }));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(
  OUT,
  JSON.stringify({
    source: `OpenStreetMap contributors (ODbL), Overpass ${new Date().toISOString().slice(0, 10)}`,
    origin: [SITE.lat, SITE.lon],
    ways,
  }),
);
console.log(`${ways.length} ways → ${OUT}`);
const counts = {};
for (const w of ways) counts[w.k] = (counts[w.k] ?? 0) + 1;
console.log(counts);
