"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { SITE } from "@/lib/geo/site";

/**
 * Real location on a flat Google map: 2D tiles (Map Tiles API, same key as the 3D tiles) drawn
 * under the tower, north-aligned with the real facade bearing. Google's 3D mesh of Mar del
 * Plata is outdated; flat tiles are not. Two looks: satellite photos or a street plan.
 *
 * Two layers, because map labels are sized for a top-down view:
 * - near: zoom 19 around the lot (~300 m), street names at a believable size;
 * - far: zoom 16 without labels (~2.4 km), melting into the horizon.
 * 50 tiles per look per visit on desktop; a look is loaded once, then kept.
 */

const TILE_API = "https://tile.googleapis.com/v1";
/** Same as EdificioLighting's horizon: the far map fades into it. */
export const MAP_HORIZON = "#e2eaee";
const DEFAULT_COPYRIGHT = `Datos del mapa ©${new Date().getFullYear()} Google`;

/** Warm, quiet roadmap that matches the site palette. */
const BASE_STYLES = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#efebe3" }] },
  // Footprints match the ground: the 3D buildings stand in for them.
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#efebe3" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#dde5d2" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#f6dfb8" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6e6a62" }] },
  { featureType: "road", elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#bcd3dd" }] },
];
const NO_LABELS = [...BASE_STYLES, { elementType: "labels", stylers: [{ visibility: "off" }] }];

type LayerSpec = {
  zoom: number;
  /** Tiles each side of the site's tile. */
  radius: number;
  labels: boolean;
  /** Edge fade: into the horizon (far layer) or to transparent over the far layer (near). */
  edge: "horizon" | "transparent";
  /** Draw order and lift above the ground, to avoid z-fighting. */
  lift: number;
};

const DEG = Math.PI / 180;
const EARTH_CIRCUMFERENCE = 40075016.686;

/** Web Mercator pixel (256 px tiles) of a lat/lon at a zoom. */
function mercatorPixel(lat: number, lon: number, zoom: number) {
  const world = 256 * 2 ** zoom;
  const s = Math.sin(lat * DEG);
  return {
    x: ((lon + 180) / 360) * world,
    y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * world,
  };
}

/** Mercator pixel → lat/lon (for the attribution bounds). */
function pixelToLatLon(x: number, y: number, zoom: number) {
  const world = 256 * 2 ** zoom;
  const lon = (x / world) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / world;
  return { lat: (Math.atan(Math.sinh(n)) * 180) / Math.PI, lon };
}

function layerLayout({ zoom, radius }: LayerSpec) {
  const site = mercatorPixel(SITE.lat, SITE.lon, zoom);
  const tx0 = Math.floor(site.x / 256) - radius;
  const ty0 = Math.floor(site.y / 256) - radius;
  const count = radius * 2 + 1;
  const worldPx = count * 256;
  const metersPerPx = (Math.cos(SITE.lat * DEG) * EARTH_CIRCUMFERENCE) / (256 * 2 ** zoom);
  const sx = site.x - tx0 * 256;
  const sy = site.y - ty0 * 256;
  const nw = pixelToLatLon(tx0 * 256, ty0 * 256, zoom);
  const se = pixelToLatLon((tx0 + count) * 256, (ty0 + count) * 256, zoom);
  return {
    tx0,
    ty0,
    count,
    size: worldPx * metersPerPx,
    // Mosaic center relative to the site, map frame (+X east, +Z south).
    center: [(worldPx / 2 - sx) * metersPerPx, (worldPx / 2 - sy) * metersPerPx] as const,
    bounds: { north: nw.lat, south: se.lat, east: se.lon, west: nw.lon },
  };
}

export type MapLook = "satellite" | "roadmap";

type Session = { session: string; tileWidth: number };

async function createSession(
  apiKey: string,
  look: MapLook,
  hiDpi: boolean,
  labels: boolean,
): Promise<Session> {
  // Satellite tiles take no styles; labels on photos would be clutter anyway.
  const options =
    look === "satellite"
      ? { mapType: "satellite" }
      : {
          mapType: "roadmap",
          // 512 px tiles with normal-size labels.
          ...(hiDpi ? { highDpi: true } : {}),
          styles: labels ? BASE_STYLES : NO_LABELS,
        };
  const res = await fetch(`${TILE_API}/createSession?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language: "es-419", region: "AR", ...options }),
  });
  if (!res.ok) throw new Error(`session-${res.status}`);
  return (await res.json()) as Session;
}

async function loadTile(apiKey: string, session: string, z: number, x: number, y: number) {
  const url = `${TILE_API}/2dtiles/${z}/${x}/${y}?session=${session}&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`tile-${res.status}`);
  return createImageBitmap(await res.blob());
}

/** Copyright line Google asks to show for the visible area. */
async function loadAttribution(
  apiKey: string,
  session: string,
  zoom: number,
  bounds: Record<"north" | "south" | "east" | "west", number>,
) {
  const params = new URLSearchParams({ session, key: apiKey, zoom: String(zoom) });
  for (const [k, v] of Object.entries(bounds)) params.set(k, String(v));
  const res = await fetch(`https://tile.googleapis.com/tile/v1/viewport?${params}`);
  if (!res.ok) return DEFAULT_COPYRIGHT;
  const data = (await res.json()) as { copyright?: string };
  return data.copyright || DEFAULT_COPYRIGHT;
}

/** Fetches a layer's tiles into one canvas texture, edges faded. */
async function buildLayerTexture(
  apiKey: string,
  spec: LayerSpec,
  look: MapLook,
  hiDpi: boolean,
  maxAnisotropy: number,
  isCancelled: () => boolean,
  onAttribution?: (text: string) => void,
) {
  const layout = layerLayout(spec);
  const { session, tileWidth } = await createSession(apiKey, look, hiDpi, spec.labels);
  if (isCancelled()) return null;
  if (onAttribution) {
    void loadAttribution(apiKey, session, spec.zoom, layout.bounds)
      .catch(() => DEFAULT_COPYRIGHT)
      .then((text) => !isCancelled() && onAttribution(text));
  }

  const px = tileWidth || 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = layout.count * px;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no-canvas");
  ctx.fillStyle = "#efebe3";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const jobs: Promise<void>[] = [];
  for (let j = 0; j < layout.count; j++) {
    for (let i = 0; i < layout.count; i++) {
      jobs.push(
        loadTile(apiKey, session, spec.zoom, layout.tx0 + i, layout.ty0 + j).then((img) => {
          ctx.drawImage(img, i * px, j * px, px, px);
          img.close();
        }),
      );
    }
  }
  const results = await Promise.allSettled(jobs);
  if (isCancelled()) return null;
  if (results.every((r) => r.status === "rejected")) throw new Error("tiles-failed");

  const half = canvas.width / 2;
  if (spec.edge === "horizon") {
    const fade = ctx.createRadialGradient(half, half, half * 0.45, half, half, half);
    fade.addColorStop(0, "rgba(226,234,238,0)");
    fade.addColorStop(1, MAP_HORIZON);
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    // Erase toward the edges so the near map blends into the far one.
    ctx.globalCompositeOperation = "destination-in";
    const fade = ctx.createRadialGradient(half, half, half * 0.6, half, half, half * 0.98);
    fade.addColorStop(0, "rgba(0,0,0,1)");
    fade.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "source-over";
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return { texture, layout };
}

type BuiltLayer = { texture: THREE.CanvasTexture; layout: ReturnType<typeof layerLayout>; spec: LayerSpec };

/**
 * Satellite → street plan. The intro writes `target` (0 = satellite seen from above, 1 = plan
 * with 3D buildings); MapGround eases `value` toward it every frame and everything else reads
 * `value`.
 */
export type MapBlend = { target: number; value: number };

const BUILDINGS_CREDIT = "Edificios: Google Open Buildings, Overture Maps";

export type MapGroundProps = {
  apiKey: string;
  blendRef: RefObject<MapBlend>;
  isMobile: boolean;
  onReady: () => void;
  onFallback: (reason: string) => void;
  onAttribution?: (text: string) => void;
};

type LookMaterials = { look: MapLook; layers: BuiltLayer[] };

export function MapGround({
  apiKey,
  blendRef,
  isMobile,
  onReady,
  onFallback,
  onAttribution,
}: MapGroundProps) {
  const gl = useThree((s) => s.gl);
  const [looks, setLooks] = useState<LookMaterials[] | null>(null);
  const [credits, setCredits] = useState<Partial<Record<MapLook, string>>>({});
  const [shownCredit, setShownCredit] = useState<MapLook>("satellite");

  const specs = useMemo<LayerSpec[]>(
    () => [
      { zoom: 16, radius: 2, labels: false, edge: "horizon", lift: 0 },
      { zoom: 19, radius: isMobile ? 1 : 2, labels: true, edge: "transparent", lift: 0.01 },
    ],
    [isMobile],
  );

  const callbacks = useRef({ onFallback, onAttribution });
  useEffect(() => {
    callbacks.current = { onFallback, onAttribution };
  }, [onFallback, onAttribution]);

  useEffect(() => {
    let cancelled = false;
    let built: LookMaterials[] = [];
    const timeout = setTimeout(() => {
      cancelled = true;
      callbacks.current.onFallback("map-timeout");
    }, 12000);
    const hiDpi = !isMobile || window.devicePixelRatio > 1.5;
    const maxAnisotropy = gl.capabilities.getMaxAnisotropy();

    const buildLook = async (look: MapLook): Promise<LookMaterials> => {
      const layers = await Promise.all(
        specs.map((spec) =>
          buildLayerTexture(
            apiKey,
            spec,
            look,
            hiDpi,
            maxAnisotropy,
            () => cancelled,
            // One credit line per look: the wide layer's covers both.
            spec.labels ? undefined : (text) => setCredits((c) => ({ ...c, [look]: text })),
          ).then((result) => (result ? { ...result, spec } : null)),
        ),
      );
      return { look, layers: layers.filter((l): l is BuiltLayer => l != null) };
    };

    // The plan is required (it's the 3D view's ground); satellite only dresses the intro.
    Promise.allSettled([buildLook("satellite"), buildLook("roadmap")]).then(([sat, road]) => {
      clearTimeout(timeout);
      built = [sat, road].flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
      if (cancelled) {
        built.forEach((l) => l.layers.forEach((x) => x.texture.dispose()));
        return;
      }
      if (road.status === "rejected") {
        callbacks.current.onFallback(String((road.reason as Error)?.message ?? road.reason));
        return;
      }
      if (sat.status === "rejected") blendRef.current.target = blendRef.current.value = 1;
      setLooks(built);
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      built.forEach((l) => l.layers.forEach((x) => x.texture.dispose()));
    };
  }, [apiKey, isMobile, specs, gl, blendRef]);

  useEffect(() => {
    const text = credits[shownCredit];
    if (!text) return;
    callbacks.current.onAttribution?.(
      shownCredit === "roadmap" ? `${text} · ${BUILDINGS_CREDIT}` : text,
    );
  }, [shownCredit, credits]);

  const satRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const roadRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const frames = useRef(0);
  const done = useRef(false);
  useFrame((_, delta) => {
    // Ease toward the target: a skipped intro still fades instead of popping.
    blendRef.current.value += (blendRef.current.target - blendRef.current.value) * Math.min(1, delta * 2.5);
    if (Math.abs(blendRef.current.target - blendRef.current.value) < 0.002) blendRef.current.value = blendRef.current.target;
    const v = blendRef.current.value;
    // Hidden only once it's fully covered: it's already on the GPU by then.
    for (const m of satRefs.current) if (m) m.visible = v < 1;
    roadRefs.current.forEach((m, i) => {
      if (!m) return;
      // Always drawn, even at opacity 0: hiding it until the fade made the browser upload the
      // big plan textures right in the middle of the descent, freezing it for about a second.
      // Far layer fades in; the near one (with labels) follows a beat later.
      m.opacity = THREE.MathUtils.clamp(i === 0 ? v * 1.4 : v * 1.4 - 0.4, 0, 1);
    });
    const credit: MapLook = v < 0.5 ? "satellite" : "roadmap";
    if (credit !== shownCredit) setShownCredit(credit);

    // Ready once the map has been drawn a couple of times.
    if (!looks || done.current) return;
    frames.current += 1;
    if (frames.current > 2) {
      done.current = true;
      onReady();
    }
  });

  // Map frame (+X east, −Z north) turned so +Z is the facade bearing (see sceneToEcefMatrix).
  const rotationY = (SITE.facadeBearing + 180) * DEG;

  return (
    <group
      position={[SITE.addressOffset.x, -0.02, SITE.addressOffset.z]}
      rotation={[0, rotationY, 0]}
    >
      {looks?.flatMap(({ look, layers }) =>
        layers.map(({ texture, layout, spec }, i) => {
          const base = look === "satellite" && spec.edge === "horizon";
          return (
            <mesh
              key={`${look}-${spec.zoom}`}
              position={[layout.center[0], 0, layout.center[1]]}
              rotation={[-Math.PI / 2, 0, 0]}
              // Satellite under the plan, wide layer under the near one.
              renderOrder={(look === "roadmap" ? 2 : 0) + i}
            >
              <planeGeometry args={[layout.size, layout.size]} />
              {/* Unlit, not tone-mapped: the map keeps its palette. */}
              <meshBasicMaterial
                ref={(m) => {
                  (look === "satellite" ? satRefs : roadRefs).current[i] = m;
                }}
                map={texture}
                toneMapped={false}
                transparent={!base}
                depthWrite={base}
                // The overlays sit on the same plane: push the base back instead of lifting them.
                polygonOffset={base}
                polygonOffsetFactor={base ? 2 : 0}
                polygonOffsetUnits={base ? 2 : 0}
              />
            </mesh>
          );
        }),
      )}
    </group>
  );
}

/** Google logo and data credits, required by the Map Tiles API policies. */
export function MapAttribution({ text }: { text: string | null }) {
  return (
    <div className="pointer-events-none absolute right-2 bottom-7 z-20 flex max-w-[60%] items-center gap-2 rounded bg-black/35 px-2 py-0.5 text-[10px] text-white/90">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://maps.gstatic.com/mapfiles/api-3/images/google_white5_hdpi.png"
        alt="Google"
        className="h-3 w-auto"
      />
      {text ? <span className="truncate">{text}</span> : null}
    </div>
  );
}
