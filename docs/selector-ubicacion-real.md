# Selector: real location

## Default: Google 2D map + 3D model city (Nov 2026)

Google's photorealistic 3D mesh of Mar del Plata is outdated, so by default the tower stands on
flat Google 2D tiles (Map Tiles API, same key), north-aligned with the real facade bearing
(Buenos Aires street in front, Entre Ríos behind).

- **Entrance** (`MapIntro.tsx`): top-down ~720 m above the lot over **satellite** photos, spiral
  descent onto the selector's overview (always the current one, no zoom-out after landing). As
  the view leaves the vertical, a shared blend value cross-fades satellite → **street plan**
  (warm custom roadmap, street names kept) and the buildings rise out of it. Fog is pushed back
  while high up. Skipped intro / deep links go straight to the plan.
- **Ground** (`MapGround.tsx`): both looks loaded up front (~100 tiles per visit on desktop).
  Two layers per look, because map labels are sized for a top-down view: zoom 19 around the lot
  (~300 m) over zoom 16 without labels (~2.4 km, fading into the horizon). Building footprints
  are hidden in the plan style: the 3D buildings replace them. Satellite failing only skips the
  photo phase; the plan failing (or 12 s) → classic procedural city.
- **Buildings** (`MapBuildings.tsx`): white architect's model. Real footprints from Overture
  Maps 2026-10-21.0 (Google Open Buildings + a few OSM; OSM alone has ~13 buildings here),
  extracted once into `public/geo/buildings/cataluna-ii.json` (3,640 buildings within 600 m,
  local east/north meters from the address point, 271 KB). **Heights are estimated** from
  footprint area (the data has none): houses on small lots, mid-rise and some towers on larger
  ones, stable per building. Whatever sits on the tower's lot is left out.
- **Overview** (where the descent ends, and "Todos"): the city view, 2.2× further back and
  higher than the classic scene, about where the model city has finished rising. The plan and
  the buildings are drawn from the start (opacity 0 / flattened) so their GPU upload happens
  behind the loader, not mid-descent.
- **Clouds** (`MapClouds.tsx`): drei volumetric puffs drifting with the wind, a ring around the
  descent (330–480 m, the camera flies through it) and more over the whole sky, plus soft cloud
  shadows sliding across the ground. Textures drawn at runtime, no assets.
- Credits bottom right: Google (imagery or map data, from `/tile/v1/viewport`) and the
  buildings' sources.

`?geo=3d` still opens the 3D tiles version described below; `?geo=0` forces the classic city.

## 3D version (`?geo=3d`): Google Photorealistic 3D Tiles

`/demos/cataluna-ii` can show the tower at its real address, **Buenos Aires 2771, Mar del Plata**,
inside Google's photorealistic city, with an aerial approach, a physical sky and clouds.
Everything else (floors, units, cards, filters, interior view) is the existing selector.

## Turning it on

1. Google Cloud Console → enable **Map Tiles API** → create an API key.
2. Restrict the key: *HTTP referrers* `https://miunidad360.com/*`, `http://localhost:3000/*`;
   *API restrictions*: Map Tiles API only. Set a daily quota cap.
3. `.env.local` (and Vercel env): `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="…"`.

The key is public by design (the browser fetches tiles from `tile.googleapis.com`); the
referrer restriction is what protects it. Without a key the page is exactly the old selector.

URL switches: `?geo=0` forces the classic scene; `?geo=preview` (dev builds only) runs sky,
clouds and flight over a plain ground with no Google requests.

## Architecture

No CesiumJS. A Cesium + Three.js hybrid needs two WebGL canvases with synced cameras, breaks
raycasting and post-processing on the units, and adds ~3 MB. Instead `3d-tiles-renderer`
(NASA-AMMOS) streams Google's tiles *into the existing Three.js scene*.

| File | Role |
| --- | --- |
| `lib/geo/site.ts` | Validated location, facade bearing, scene ⇄ ECEF transform |
| `lib/geo/config.ts` | API key, WebGL 2 check, dev preview switch |
| `lib/geo/TileNormalsPlugin.ts`, `tile-normals.worker.ts` | Normals for Google tiles (needed by the sunlight), in a worker |
| `components/three/geo/GoogleTiles.tsx` | Tiles, auth, Draco, fade, lot flattening, ground calibration, coverage, attribution |
| `components/three/geo/GeoAtmosphere.tsx` | Sky, sun, aerial perspective, clouds, shadows, clip planes |
| `components/three/geo/AerialFlyover.tsx` | Sea → Paseo Aldrey → Buenos Aires 2771 → selector overview |
| `components/three/geo/GeoEnvironment.tsx` | Composition, readiness, fallback (lazy-loaded) |

Existing files touched: `SelectorScene` (geo branch; the classic branch is unchanged),
`SelectorExperience` (flag, intro state, skip, captions, fallback), `CameraRig`
(`startFromCurrent`: glide in from the current camera instead of snapping), `lib/sun/*`
(optional facade bearing so sun hours use the real orientation), `next.config.ts` (cache
headers for `/geo/*`), `globals.css` (caption animation).

### Coordinates

The scene keeps its own frame (meters, +Y up, tower at the origin). The **tileset** is moved,
never the tower, so all camera and selector math is untouched. +Z points at the street facade
(bearing 123.1°, ESE, toward the sea).

- Position: OSM address interpolation (way 431707402, 2701 → 2799) → −38.010459, −57.548978;
  Nominatim agrees.
- Orientation: OSM street way 456080412 runs at 213.1°; the lot is on its north-west side.
- Elevation: SRTM 17 m + EGM2008 14.15 m = 31.2 m ellipsoidal, then measured at runtime by
  raycasting the road in front of the lot and re-basing the tiles (±25 m sanity band).
- The lot under the tower is flattened to ground level (`TileFlatteningPlugin`) so whatever
  Google captured there doesn't poke through the model.

### Lighting

Mixed lighting (`@takram/three-atmosphere`): Google tiles are unlit photos, lit in
post-process from their normals; the tower keeps real lights (sun with shadows + sky probe)
on its own layer. Both use the same real sun (today, 10:30 Mar del Plata time), so shading
and shadows agree. A shadow catcher puts the tower's shadow on the street. Clouds:
`@takram/three-clouds`, desktop only, base 1.8 km (above the flight), drifting, no cloud
shadows (they would darken the street but not the tower).

### Loading and fallback

- Geo code (~1 MB JS) is lazy-loaded only when geo mode is on.
- Static assets in `public/geo/` (~12 MB, cached 30 days): atmosphere tables (EXR), cloud
  textures, noise texture, Draco decoder. Self-hosted: no runtime GitHub/CDN dependency. The
  atmosphere tables are downloaded rather than generated because runtime generation rendered
  a black sky on an Intel/ANGLE GPU.
- The loader stays until the opening view's tiles and the atmosphere tables are in (10 s cap).
- Falls back to the classic city on: no key, no WebGL 2, auth/quota/network error, or no root
  tileset within 12 s. Embedded (homepage) and capture mode always use the classic scene, so
  the homepage never spends tile sessions.
- Phones: no clouds, coarser tiles (error target 24 vs 12), smaller tile cache and shadow map.

### Attribution

`TilesAttributionOverlay` shows Google's data credits plus the Google logo (bottom right,
above the demo label) whenever tiles are visible, as the Map Tiles API policies require.

## Known limitations

- **Not tested with real Google tiles yet** (no key was available). Everything else was
  checked in the browser with `?geo=preview`. With a key, check: coverage
  (`window.__geoCoverage` in the console; `photorealistic3D: true` means real 3D buildings
  near the lot), the flattening footprint, and the opening shot.
- The tower is the procedural 12-floor demo building (24 × 17 m), not Cataluña II's real
  7-floor design; it is placed with its 24 m side on the street, which is wider than the real
  lot. The demo label says "edificio, precios y estados ilustrativos".
- Sun hours in the panel use the real orientation but the procedural city's neighbors as
  shadow casters, not Google's buildings.
