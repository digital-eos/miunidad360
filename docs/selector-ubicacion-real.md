# Selector: real location (Google Photorealistic 3D Tiles)

`/demos/cataluna-ii` can show the tower at its real address, **Buenos Aires 2771, Mar del Plata**,
inside Google's photorealistic city, with an aerial approach, a physical sky and clouds.
Everything else (floors, units, cards, filters, interior view) is the existing selector.

## Turning it on

1. Google Cloud Console → enable **Map Tiles API** → create an API key.
2. Restrict the key: *HTTP referrers* `https://miunidad360.com.ar/*`, `http://localhost:3000/*`;
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
